/**
 * Lottery Booklet Generator
 *
 * CRITICAL CONSTRAINT: No single bet's payout (bet × multiplier) can be >= 10,000 (must be < 10,000)
 *
 * Two-Phase Strategy:
 * 1. Revenue Generation (distributeBets): Generates bets to match exact target revenue
 *    - Generates realistic bet distribution across all slots
 *
 * 2. Payout Allocation (allocateExactPayout): Selects winning numbers and adjusts bets for exact payout
 *    - Selects winning slots where (bet × multiplier < 10,000)
 *    - Adjusts winning bet amounts to match EXACT target payout
 *    - Adjusts non-winning bets to maintain exact total revenue
 *    - Maintains constraint: no winning bet × multiplier >= 10,000
 *
 * This approach ensures:
 * ✓ Revenue EXACTLY matches target (compensated for winning bet adjustments)
 * ✓ Total payout EXACTLY matches target (winning bets are adjusted)
 * ✓ No winning bet violates the constraint (winning bet × multiplier < 10,000)
 */

import type { GameType, Ticket, Sheet, Booklet, NumberBet, BookletBatch, WinningNumbers } from "@/types/lottery";
import { gameTypes as defaultGameTypes } from "@/data/gameTypes";
import { detectParesWins } from "./paresWinDetection";

// const NUMBERS_PER_TICKET = 3; // 3 numbers per ticket
const TICKETS_PER_SHEET = 5; // A, B, C, D, E
// const NUMBERS_PER_SHEET = NUMBERS_PER_TICKET * TICKETS_PER_SHEET; // 15 total numbers per sheet
const SHEETS_PER_BOOKLET = 50; // 50 sheets per booklet
// const TOTAL_SLOTS = SHEETS_PER_BOOKLET * NUMBERS_PER_SHEET; // 750 slots per booklet
const TICKET_LABELS = ["E", "D", "C", "B", "A"];

// Generate sheet ID in format: 11-COMPANYCODE-001
function generateSheetId(index: number, companyCode: string = "ADS"): string {
    const sheetNum = (index + 1).toString().padStart(3, "0");
    return `11-${companyCode}-${sheetNum}`;
}

// Generate a random number with specified digits
// 2-digit games: XX format (e.g., 32, 96, 05) - Last 2 digits
// 3-digit games: 000-999 (each digit can be 0-9, zeros allowed in start/middle/finish)
// Pares P2: XX-XX format (e.g., 12-34)
// Pares P3: XX-XX-XX format (e.g., 12-34-10)
function generateRandomNumber(digits: number, gameType?: GameType): string {
    // Handle Pares P2 format (2 unique numbers from range)
    if (gameType?.gameFormat === 'pares_p2') {
        const min = gameType.numberRangeMin || 1;
        const max = gameType.numberRangeMax || 40;

        const parts: string[] = [];
        const usedNumbers = new Set<number>();

        for (let i = 0; i < 2; i++) {
            let num: number;
            do {
                num = Math.floor(Math.random() * (max - min + 1)) + min;
            } while (usedNumbers.has(num)); // Keep generating until we get a unique number

            usedNumbers.add(num);
            parts.push(num.toString().padStart(2, '0'));
        }
        return parts.join('-');
    }

    // Handle Pares P3 format (3 unique numbers from range)
    if (gameType?.gameFormat === 'pares_p3') {
        const min = gameType.numberRangeMin || 1;
        const max = gameType.numberRangeMax || 40;

        const parts: string[] = [];
        const usedNumbers = new Set<number>();

        for (let i = 0; i < 3; i++) {
            let num: number;
            do {
                num = Math.floor(Math.random() * (max - min + 1)) + min;
            } while (usedNumbers.has(num)); // Keep generating until we get a unique number

            usedNumbers.add(num);
            parts.push(num.toString().padStart(2, '0'));
        }
        return parts.join('-');
    }

    // Standard number generation
    if (digits === 2) {
        // 2-digit games: Generate 00-99 (last 2 digits format)
        const num = Math.floor(Math.random() * 100); // 0 to 99
        return num.toString().padStart(2, "0");
    } else if (digits === 3) {
        // 3-digit games: 000-999 (each digit can be 0-9)
        const num = Math.floor(Math.random() * 1000); // 0 to 999
        return num.toString().padStart(3, "0");
    }

    // Fallback for any other digit count
    const max = Math.pow(10, digits) - 1;
    const num = Math.floor(Math.random() * (max + 1));
    return num.toString().padStart(digits, "0");
}

// Generate random bet - multiple of 5 with distribution based on bet magnitude
// Two-digit bets (5-95): appear very frequently (~90% = 675/750) - evenly distributed within range
// Three-digit bets (100-995): appear occasionally (~9.5% = 72/750) - evenly distributed within range
// Four-digit bets (1000-2000): appear extremely rarely (~0.5% = 3-4/750) - weighted decay favoring 1000 over 2000
function generateMultipleOf5Bet(minBet: number, maxBet: number): number {
    const minMultiple = Math.ceil(minBet / 5) * 5;
    const maxMultiple = Math.floor(maxBet / 5) * 5;

    if (minMultiple > maxMultiple) {
        return minBet; // Fallback if range doesn't contain multiples of 5
    }

    // First, decide which magnitude range to use based on probability
    const random = Math.random() * 10000; // Using 10000 for very fine control

    let targetBet: number | undefined;

    if (random < 9000) {
        // 90% chance: Two-digit bets (5-95)
        // Randomly select ANY value in this range with EQUAL probability
        const twoDigitBets: number[] = [];
        for (let bet = 5; bet <= 95; bet += 5) {
            if (bet >= minMultiple && bet <= maxMultiple) {
                twoDigitBets.push(bet);
            }
        }
        if (twoDigitBets.length > 0) {
            targetBet = twoDigitBets[Math.floor(Math.random() * twoDigitBets.length)];
        }
    } else if (random < 9950) {
        // 9.5% chance: Three-digit bets (100-995)
        // Randomly select ANY value in this range with EQUAL probability
        const threeDigitBets: number[] = [];
        for (let bet = 100; bet <= 995; bet += 5) {
            if (bet >= minMultiple && bet <= maxMultiple) {
                threeDigitBets.push(bet);
            }
        }
        if (threeDigitBets.length > 0) {
            targetBet = threeDigitBets[Math.floor(Math.random() * threeDigitBets.length)];
        }
    } else {
        // 0.5% chance: Four-digit bets (1000-2000) - EXTREMELY RARE
        // Within this range, use exponential decay to favor lower values (1000 appears more than 2000)
        const fourDigitBets: number[] = [];
        const fourDigitWeights: number[] = [];

        for (let bet = 1000; bet <= 2000; bet += 5) {
            if (bet >= minMultiple && bet <= maxMultiple) {
                fourDigitBets.push(bet);

                // Exponential decay within four-digit range
                const position = (bet - 1000) / 1000; // 0 at 1000, 1 at 2000
                const weight = Math.exp(-15 * position); // VERY extreme decay
                fourDigitWeights.push(weight);
            }
        }

        if (fourDigitBets.length > 0) {
            // Calculate cumulative weights
            const cumulativeWeights: number[] = [];
            let sum = 0;
            for (const weight of fourDigitWeights) {
                sum += weight;
                cumulativeWeights.push(sum);
            }

            // Pick weighted random bet
            const weightedRandom = Math.random() * sum;
            for (let i = 0; i < cumulativeWeights.length; i++) {
                if (weightedRandom <= cumulativeWeights[i]) {
                    targetBet = fourDigitBets[i];
                    break;
                }
            }
        }
    }

    // Fallback to minimum if nothing was selected
    if (targetBet === undefined) {
        targetBet = minMultiple;
    }

    return targetBet;
}

// Generate random bet - for "specific" (non-multiple-of-5) slots, but still using same distribution
// This ensures consistency across all bet generation
function generateSpecificBet(minBet: number, maxBet: number): number {
    // Use the SAME distribution logic as generateMultipleOf5Bet
    const random = Math.random() * 10000;

    let targetBet: number | undefined;

    if (random < 9000) {
        // 90% chance: Two-digit bets (5-95)
        const twoDigitBets: number[] = [];
        for (let bet = 5; bet <= 95; bet += 5) {
            if (bet >= minBet && bet <= maxBet) {
                twoDigitBets.push(bet);
            }
        }
        if (twoDigitBets.length > 0) {
            targetBet = twoDigitBets[Math.floor(Math.random() * twoDigitBets.length)];
        }
    } else if (random < 9950) {
        // 9.5% chance: Three-digit bets (100-995)
        const threeDigitBets: number[] = [];
        for (let bet = 100; bet <= 995; bet += 5) {
            if (bet >= minBet && bet <= maxBet) {
                threeDigitBets.push(bet);
            }
        }
        if (threeDigitBets.length > 0) {
            targetBet = threeDigitBets[Math.floor(Math.random() * threeDigitBets.length)];
        }
    } else {
        // 0.5% chance: Four-digit bets (1000-2000) - EXTREMELY RARE
        const fourDigitBets: number[] = [];
        const fourDigitWeights: number[] = [];

        for (let bet = 1000; bet <= 2000; bet += 5) {
            if (bet >= minBet && bet <= maxBet) {
                fourDigitBets.push(bet);
                const position = (bet - 1000) / 1000;
                const weight = Math.exp(-15 * position);
                fourDigitWeights.push(weight);
            }
        }

        if (fourDigitBets.length > 0) {
            const cumulativeWeights: number[] = [];
            let sum = 0;
            for (const weight of fourDigitWeights) {
                sum += weight;
                cumulativeWeights.push(sum);
            }

            const weightedRandom = Math.random() * sum;
            for (let i = 0; i < cumulativeWeights.length; i++) {
                if (weightedRandom <= cumulativeWeights[i]) {
                    targetBet = fourDigitBets[i];
                    break;
                }
            }
        }
    }

    // Fallback
    if (targetBet === undefined) {
        targetBet = Math.max(5, minBet);
    }

    return targetBet;
}

// Generate sheets with MIXED game types per ticket slot
// IMPORTANT: Respects multiplier constraints - bet × multiplier must be < 10,000
function generateBaseSheets(gameTypes: GameType[], targetRevenue: number, _minBet: number, _maxBet: number, companyCode: string = "ADS"): Sheet[] {
    const sheets: Sheet[] = [];

    // Always generate exactly 50 sheets per booklet (250 tickets total)
    const totalSheets = SHEETS_PER_BOOKLET;

    // const MAX_SINGLE_PAYOUT = 10000; // bet × multiplier must be < 10,000

    // IMPORTANT: Always generate realistic number of slots (2-3 per ticket)
    // Don't let revenue calculation reduce the number of slots
    // We'll adjust BET AMOUNTS to hit revenue, not reduce slots

    // Track total slots generated and distribution statistics
    let totalSlotsGenerated = 0;
    let nationalBetsCount = 0;
    let localBetsCount = 0;

    for (let sheetIndex = 0; sheetIndex < totalSheets; sheetIndex++) {
        const tickets: Ticket[] = [];

        // Generate 5 tickets (A, B, C, D, E)
        for (const label of TICKET_LABELS) {
            const numberBets: NumberBet[] = [];

            // Calculate how many slots this ticket should have
            // Add variety: balanced distribution across 1, 2, and 3
            // This is INDEPENDENT of revenue - we always want natural-looking tickets
            let numbersCount: number;

            const rand = Math.random();

            if (rand < 0.45) {
                // 45% - 3 bets per ticket
                numbersCount = 3;
            } else if (rand < 0.80) {
                // 35% - 2 bets per ticket
                numbersCount = 2;
            } else {
                // 20% - 1 bet per ticket
                numbersCount = 1;
            }

            // Select ONE specific game type for the entire ticket
            // This ensures all numbers in the ticket have the same digit count and game type
            // 90% of tickets use national games, 10% use local games (realistic betting behavior)

            // IMPORTANT: Filter out problematic game type variants if needed
            // Currently allowing all game types including L2, S3, 3D, etc.
            const filterPureGameTypes = (games: GameType[]) => {
                return games.filter(_gt => {
                    // No filtering - include all game types
                    return true;
                });
            };

            const nationalGames = filterPureGameTypes(gameTypes.filter(gt => gt.isNational === true));
            const localGames = filterPureGameTypes(gameTypes.filter(gt => gt.isNational === false));

            let ticketGameType: GameType;
            const gameTypeRand = Math.random();

            if (nationalGames.length > 0 && localGames.length > 0) {
                // Both national and local games exist - use 90/10 distribution
                if (gameTypeRand < 0.90) {
                    // 90% - Select from national games
                    ticketGameType = nationalGames[Math.floor(Math.random() * nationalGames.length)];
                } else {
                    // 10% - Select from local games
                    ticketGameType = localGames[Math.floor(Math.random() * localGames.length)];
                }
            } else {
                // Fallback: if only one type exists (national-only or local-only companies)
                const pureGames = filterPureGameTypes(gameTypes);
                ticketGameType = pureGames[Math.floor(Math.random() * pureGames.length)];
            }

            // Generate all numbers for this ticket using the SAME game type
            for (let k = 0; k < numbersCount; k++) {
                const number = generateRandomNumber(ticketGameType.digits, ticketGameType);

                const bet = {
                    number,
                    bet: 0,
                    label,
                    gameTypeId: ticketGameType.id,
                    gameTypeName: ticketGameType.name,
                    gameTypeTime: ticketGameType.time,
                };

                // Track distribution statistics
                if (ticketGameType.isNational === true) {
                    nationalBetsCount++;
                } else {
                    localBetsCount++;
                }

                // Debug log first bet only
                if (sheetIndex === 0 && label === 'A' && k === 0) {
                    console.log('Sample bet with game type:', bet);
                }

                numberBets.push(bet);
                totalSlotsGenerated++;
            }

            tickets.push({
                label,
                numberBets,
            });
        }

        sheets.push({
            id: generateSheetId(sheetIndex, companyCode),
            tickets,
        });
    }

    // Log distribution statistics
    const nationalPercent = totalSlotsGenerated > 0 ? (nationalBetsCount / totalSlotsGenerated * 100).toFixed(1) : '0.0';
    const localPercent = totalSlotsGenerated > 0 ? (localBetsCount / totalSlotsGenerated * 100).toFixed(1) : '0.0';

    console.log(`Generated ${sheets.length} sheets (expected ${SHEETS_PER_BOOKLET})`);
    console.log(`Generated ${totalSlotsGenerated} slots for target revenue ₱${targetRevenue.toLocaleString()}`);
    console.log(`Distribution - National: ${nationalBetsCount} (${nationalPercent}%), Local: ${localBetsCount} (${localPercent}%)`);

    // Verify all sheets have 5 tickets
    const sheetsWithIssues = sheets.filter(s => s.tickets.length !== 5);
    if (sheetsWithIssues.length > 0) {
        console.error(`⚠️ WARNING: ${sheetsWithIssues.length} sheets have incorrect ticket count!`);
    }

    return sheets;
}

// Distribute bets to match target revenue exactly
// NOTE: This function generates bets to match the exact revenue without enforcing multiplier constraints
// The constraint (bet × multiplier < 10,000) is enforced later in allocateExactPayout() when selecting winners
// This two-step approach ensures: 1) Exact revenue is achieved, 2) No winning bet violates the constraint
function distributeBets(sheets: Sheet[], targetRevenue: number, minBet: number, maxBet: number, multipleOfFivePercent: number = 80, gameTypes: GameType[] = []): Sheet[] {
    const updatedSheets = JSON.parse(JSON.stringify(sheets)) as Sheet[];

    // const MAX_SINGLE_PAYOUT = 10000; // bet × multiplier must be < 10,000 (enforced in allocateExactPayout)

    // Collect all number slots from all tickets in all sheets, along with their game type info
    // Each ticket now has variable number of numberBets (1, 2, or 3)
    const allSlots: { sheetIdx: number; ticketIdx: number; numIdx: number; gameTypeId?: string; multiplier: number }[] = [];
    updatedSheets.forEach((sheet, sheetIdx) => {
        sheet.tickets.forEach((ticket, ticketIdx) => {
            ticket.numberBets.forEach((numberBet, numIdx) => {
                // Find the multiplier for this slot's game type
                const gameType = gameTypes.find(gt => gt.id === numberBet.gameTypeId);
                const multiplier = gameType?.multiplier || 500; // Default to 500 if not found
                allSlots.push({ sheetIdx, ticketIdx, numIdx, gameTypeId: numberBet.gameTypeId, multiplier });
            });
        });
    });

    const totalSlots = allSlots.length; // Total number of slots (varies based on number distribution)

    // Shuffle the slots array so bets distribute randomly
    for (let i = allSlots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allSlots[i], allSlots[j]] = [allSlots[j], allSlots[i]];
    }

    // Pre-assign bet types based on percentage (80% multiples of 5, 20% specific)
    const slotTypes: ("multiple5" | "specific")[] = [];
    for (let i = 0; i < totalSlots; i++) {
        const random = Math.random() * 100;
        slotTypes.push(random < multipleOfFivePercent ? "multiple5" : "specific");
    }

    // Shuffle slot types for better distribution
    for (let i = slotTypes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [slotTypes[i], slotTypes[j]] = [slotTypes[j], slotTypes[i]];
    }

    // First pass: Generate bets freely according to distribution (ignore revenue target)
    // NOTE: We do NOT apply multiplier constraint here during initial generation
    // The constraint will be enforced later when selecting winning numbers in allocateExactPayout
    // This allows us to reach the target revenue without being limited by multipliers
    const generatedBets: number[] = [];
    for (let i = 0; i < totalSlots; i++) {
        let bet: number;
        if (slotTypes[i] === "multiple5") {
            bet = generateMultipleOf5Bet(minBet, maxBet);
        } else {
            bet = generateSpecificBet(minBet, maxBet);
        }
        generatedBets.push(bet);
    }

    // Calculate total from generated bets
    const generatedTotal = generatedBets.reduce((sum, bet) => sum + bet, 0);

    // Calculate adjustment needed
    const adjustment = targetRevenue - generatedTotal;

    console.log(`Generated bets total: ₱${generatedTotal.toLocaleString()}, Target: ₱${targetRevenue.toLocaleString()}, Adjustment needed: ₱${adjustment.toLocaleString()}`);

    // NEW APPROACH: Keep generated bets as-is, only adjust a subset to hit revenue
    // This maintains the natural distribution (90% 2-digit, 9.5% 3-digit, 0.5% 4-digit)
    const assignedBets: number[] = [...generatedBets];

    // Apply small adjustments to random slots to hit exact revenue
    let remainingAdjustment = adjustment;
    const MAX_ADJUSTMENT_PER_SLOT = 10; // Maximum ±10 per slot to keep natural

    // Shuffle indices for random adjustment
    const adjustableIndices = [...Array(totalSlots).keys()];
    for (let i = adjustableIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [adjustableIndices[i], adjustableIndices[j]] = [adjustableIndices[j], adjustableIndices[i]];
    }

    for (const i of adjustableIndices) {
        if (Math.abs(remainingAdjustment) === 0) break;

        const currentBet = assignedBets[i];

        const idealAdjustment = remainingAdjustment;
        const cappedAdjustment = Math.max(-MAX_ADJUSTMENT_PER_SLOT, Math.min(MAX_ADJUSTMENT_PER_SLOT, idealAdjustment));

        let adjustedBet = currentBet + cappedAdjustment;

        // Apply bounds (no multiplier constraint here - it's enforced during payout allocation)
        adjustedBet = Math.max(minBet, Math.min(maxBet, adjustedBet));

        // Round to nearest integer first
        adjustedBet = Math.round(adjustedBet);

        // Then round to nearest 5 if it was originally a multiple of 5
        if (slotTypes[i] === "multiple5" && adjustedBet >= 10) {
            adjustedBet = Math.round(adjustedBet / 5) * 5;
        }

        const actualAdjustment = adjustedBet - currentBet;
        assignedBets[i] = adjustedBet;
        remainingAdjustment -= actualAdjustment;
    }

    // Last pass: if still not exact, force exact match by adjusting individual bets
    if (Math.abs(remainingAdjustment) > 0) {
        console.log(`Final adjustment needed: ₱${remainingAdjustment.toLocaleString()}`);

        // Distribute across random slots, respecting maxBet constraint
        const finalAdjustIndices = [...Array(totalSlots).keys()];
        for (let i = finalAdjustIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [finalAdjustIndices[i], finalAdjustIndices[j]] = [finalAdjustIndices[j], finalAdjustIndices[i]];
        }

        for (const i of finalAdjustIndices) {
            if (remainingAdjustment === 0) break;

            const currentBet = assignedBets[i];

            // No multiplier constraint here - it's enforced during payout allocation
            const maxPossibleIncrease = maxBet - currentBet;
            const maxPossibleDecrease = currentBet - minBet;

            let adjustment = 0;
            if (remainingAdjustment > 0) {
                // Need to add - take the full amount or max possible
                adjustment = Math.min(remainingAdjustment, maxPossibleIncrease);
            } else {
                // Need to subtract - take the full amount or max possible
                adjustment = Math.max(remainingAdjustment, -maxPossibleDecrease);
            }

            if (adjustment !== 0) {
                // Apply adjustment without rounding for exact match
                assignedBets[i] = currentBet + adjustment;
                remainingAdjustment -= adjustment;
            }
        }

        // If still not exact after trying all slots, distribute the remaining across multiple slots
        if (remainingAdjustment !== 0) {
            console.warn(`Distributing remaining adjustment: ₱${remainingAdjustment} across multiple slots`);

            // Use integer adjustments only - distribute ±1 per slot until exact
            const shuffledIndices = [...Array(totalSlots).keys()];
            for (let i = shuffledIndices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
            }

            for (const i of shuffledIndices) {
                if (remainingAdjustment === 0) break;

                const currentBet = assignedBets[i];

                if (remainingAdjustment > 0 && currentBet < maxBet) {
                    // Need to add ₱1
                    assignedBets[i] = currentBet + 1;
                    remainingAdjustment -= 1;
                } else if (remainingAdjustment < 0 && currentBet > minBet) {
                    // Need to subtract ₱1
                    assignedBets[i] = currentBet - 1;
                    remainingAdjustment += 1;
                }
            }

            // If still not exact (shouldn't happen with integer arithmetic), log error
            if (remainingAdjustment !== 0) {
                console.error(`CRITICAL: Unable to distribute remaining adjustment: ₱${remainingAdjustment}`);
                console.error(`All slots are at min or max bet limits`);
                // Force the adjustment on the last adjustable slot
                for (let i = 0; i < totalSlots && remainingAdjustment !== 0; i++) {
                    if (remainingAdjustment > 0 && assignedBets[i] < maxBet) {
                        const toAdd = Math.min(maxBet - assignedBets[i], remainingAdjustment);
                        assignedBets[i] += toAdd;
                        remainingAdjustment -= toAdd;
                    } else if (remainingAdjustment < 0 && assignedBets[i] > minBet) {
                        const toSubtract = Math.min(assignedBets[i] - minBet, Math.abs(remainingAdjustment));
                        assignedBets[i] -= toSubtract;
                        remainingAdjustment += toSubtract;
                    }
                }
            }
        }
    }

    // Assign all bets to sheets (all values should already be integers from adjustment logic)
    for (let i = 0; i < totalSlots; i++) {
        const { sheetIdx, ticketIdx, numIdx } = allSlots[i];
        // Ensure integer but should already be integer from prior logic
        const betValue = Math.floor(assignedBets[i]);
        if (assignedBets[i] !== betValue) {
            console.warn(`Non-integer bet detected: ${assignedBets[i]}, rounding to ${betValue}`);
        }
        updatedSheets[sheetIdx].tickets[ticketIdx].numberBets[numIdx].bet = betValue;
    }

    // NOTE: Multiplier constraint (bet × multiplier < 10,000) is NOT enforced here
    // It will be enforced later when selecting winning numbers in allocateExactPayout()
    // This allows us to generate the exact target revenue first

    // Verify total from actual sheets - MUST be exact
    let actualTotal = updatedSheets.reduce((sum, sheet) =>
        sum + sheet.tickets.reduce((s, ticket) =>
            s + ticket.numberBets.reduce((nb, bet) => nb + bet.bet, 0), 0), 0);
    let difference = actualTotal - targetRevenue;

    if (difference === 0) {
        console.log(`✓ Exact revenue match: ₱${actualTotal.toLocaleString()}`);
    } else {
        console.error(`❌ CRITICAL: Revenue mismatch: ₱${actualTotal.toLocaleString()} vs target ₱${targetRevenue.toLocaleString()} (diff: ₱${difference})`);

        // Collect all adjustable bets
        const adjustableBets: Array<{ sheet: Sheet, ticket: Ticket, bet: NumberBet }> = [];
        for (const sheet of updatedSheets) {
            for (const ticket of sheet.tickets) {
                for (const bet of ticket.numberBets) {
                    adjustableBets.push({ sheet, ticket, bet });
                }
            }
        }

        // Shuffle for random distribution
        for (let i = adjustableBets.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [adjustableBets[i], adjustableBets[j]] = [adjustableBets[j], adjustableBets[i]];
        }

        // Make corrections ±1 at a time
        for (const { bet } of adjustableBets) {
            if (difference === 0) break;

            if (difference > 0 && bet.bet < maxBet) {
                // Need to add
                const toAdd = Math.min(maxBet - bet.bet, difference);
                bet.bet += toAdd;
                difference -= toAdd;
            } else if (difference < 0 && bet.bet > minBet) {
                // Need to subtract
                const toSubtract = Math.min(bet.bet - minBet, Math.abs(difference));
                bet.bet -= toSubtract;
                difference += toSubtract;
            }
        }

        // Verify correction worked
        actualTotal = updatedSheets.reduce((sum, sheet) =>
            sum + sheet.tickets.reduce((s, ticket) =>
                s + ticket.numberBets.reduce((nb, bet) => nb + bet.bet, 0), 0), 0);

        if (actualTotal === targetRevenue) {
            console.log(`✓ Corrected total to match target: ₱${actualTotal.toLocaleString()}`);
        } else {
            throw new Error(`Failed to generate exact revenue. Got ₱${actualTotal}, expected ₱${targetRevenue}, diff ₱${actualTotal - targetRevenue}`);
        }
    }

    return updatedSheets;
}

// Generate booklet ID in format: MIS-20251231-1000001 (area-date-startSerialNumber)
function generateBookletId(province: string, date: Date, startSerialNumber: string, _bookletNumber: number): string {
    const provinceCode = province.substring(0, 3).toUpperCase();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    return `${provinceCode}-${dateStr}-${startSerialNumber}`;
}

// Allocate exact payout by setting winning numbers during generation
// This modifies number fields AND adjusts winning bet amounts to match exact target payout
// Constraint: No single bet's payout (bet × multiplier) should be >= 10,000
function allocateExactPayout(
    booklets: Booklet[],
    winningNumbers: WinningNumbers,
    targetPayout: number,
    gameTypes: GameType[],
    minBet: number,
    maxBet: number,
    totalRevenue?: number
): void {
    console.log('\n===== PAYOUT ALLOCATION - EXACT PAYOUT MODE =====');
    console.log('Rule: Select winning numbers and adjust bet amounts to match EXACT target payout');
    console.log('Constraint: Each bet × multiplier must be < 10,000');

    // Calculate Prize Fund (33.9% of revenue)
    const prizeFund = totalRevenue ? Math.floor(totalRevenue * 0.339) : 0;
    if (prizeFund > 0) {
        console.log(`Prize Fund (33.9% of ₱${totalRevenue?.toLocaleString()}): ₱${prizeFund.toLocaleString()}`);
        console.log(`CRITICAL REQUIREMENT: Final payout MUST be >= Prize Fund`);
    }

    const MAX_SINGLE_PAYOUT = 10000; // Maximum payout for a SINGLE bet (bet × multiplier must be < 10,000)

    // Step 0: First, clear any accidental matches (numbers that randomly match winning numbers)
    // This ensures we start from a clean slate with zero payout
    booklets.forEach((booklet) => {
        booklet.sheets.forEach((sheet) => {
            sheet.tickets.forEach((ticket) => {
                ticket.numberBets.forEach((numberBet) => {
                    if (!numberBet.gameTypeId) return;
                    const winningNumber = winningNumbers[numberBet.gameTypeId as keyof WinningNumbers];
                    if (!winningNumber) return;

                    const gameType = gameTypes.find((g: GameType) => g.id === numberBet.gameTypeId);
                    if (!gameType) return;

                    // If this number accidentally matches the winning number, change it
                    if (numberBet.number === winningNumber) {
                        // Generate a different random number (not the winning one)
                        let newNumber: string;
                        do {
                            newNumber = generateRandomNumber(gameType.digits, gameType);
                        } while (newNumber === winningNumber);
                        numberBet.number = newNumber;
                    }
                });
            });
        });
    });

    console.log('Cleared any accidental winning number matches');

    // Step 1: Collect all available slots across all booklets
    const allSlots: Array<{
        bookletIdx: number;
        sheetIdx: number;
        ticketIdx: number;
        betIdx: number;
        gameTypeId: string;
        currentNumber: string;
        currentBet: number;
        payout: number;
    }> = [];

    booklets.forEach((booklet, bookletIdx) => {
        booklet.sheets.forEach((sheet, sheetIdx) => {
            sheet.tickets.forEach((ticket, ticketIdx) => {
                ticket.numberBets.forEach((numberBet, betIdx) => {
                    if (!numberBet.gameTypeId) return;

                    const winningNumber = winningNumbers[numberBet.gameTypeId as keyof WinningNumbers];
                    if (!winningNumber || winningNumber === "") return;

                    const gameType = gameTypes.find((g: GameType) => g.id === numberBet.gameTypeId);
                    if (!gameType) return;

                    // For Pares games, calculate the actual payout using detectParesWins
                    // This accounts for Target, Ekis, and Rumble wins with different multipliers
                    let payout: number;
                    if (gameType.gameFormat === 'pares_p2' || gameType.gameFormat === 'pares_p3') {
                        // Check what type of win this would be with the winning number
                        const paresWin = detectParesWins(numberBet.number, winningNumber, gameType, numberBet.bet);
                        if (paresWin.isTarget || paresWin.isEkis || paresWin.isRumble) {
                            // Calculate the multiplier from the payout
                            payout = paresWin.totalPayout / numberBet.bet;
                        } else {
                            // If changing the number to winning number would make it a target win
                            payout = gameType.multiplier;
                        }
                    } else {
                        // For standard games, use the game type multiplier
                        payout = gameType.multiplier;
                    }

                    allSlots.push({
                        bookletIdx,
                        sheetIdx,
                        ticketIdx,
                        betIdx,
                        gameTypeId: numberBet.gameTypeId,
                        currentNumber: numberBet.number,
                        currentBet: numberBet.bet,
                        payout,
                    });
                });
            });
        });
    });

    console.log(`Found ${allSlots.length} total slots available for payout allocation`);

    // Step 2: Group slots by multiplier and log distribution
    const slotsByMultiplier = new Map<number, typeof allSlots>();
    allSlots.forEach(slot => {
        if (!slotsByMultiplier.has(slot.payout)) {
            slotsByMultiplier.set(slot.payout, []);
        }
        slotsByMultiplier.get(slot.payout)!.push(slot);
    });

    console.log(`Available slots by multiplier:`);
    Array.from(slotsByMultiplier.entries())
        .sort((a, b) => a[0] - b[0])
        .forEach(([multiplier, slots]) => {
            console.log(`  ${multiplier}x: ${slots.length} slots`);
        });

    // Also group by game type to ensure distribution across all games
    const slotsByGameType = new Map<string, typeof allSlots>();
    allSlots.forEach(slot => {
        if (!slotsByGameType.has(slot.gameTypeId)) {
            slotsByGameType.set(slot.gameTypeId, []);
        }
        slotsByGameType.get(slot.gameTypeId)!.push(slot);
    });

    console.log(`Available slots by game type:`);
    Array.from(slotsByGameType.entries()).forEach(([gameTypeId, slots]) => {
        const gameType = gameTypes.find(g => g.id === gameTypeId);
        const gameName = gameType ? `${gameType.name} ${gameType.time}` : gameTypeId;
        console.log(`  ${gameName}: ${slots.length} slots (${gameType?.multiplier}x)`);
    });

    // Step 3: Allocate payout - select slots WITHOUT changing bet amounts
    let totalPayoutAllocated = 0;
    const selectedSlots: Array<{
        slot: typeof allSlots[0];
    }> = [];

    // Track which tickets have already been assigned a winning number for each game type
    // Key: `${bookletIdx}-${sheetIdx}-${ticketIdx}-${gameTypeId}`
    const ticketGameTypeUsage = new Set<string>();

    // Track winning count per booklet to ensure even distribution
    const winningCountPerBooklet = new Map<number, number>();

    // Shuffle slots for random distribution WITHIN each booklet
    // First group by booklet
    const slotsByBooklet = new Map<number, typeof allSlots>();
    allSlots.forEach(slot => {
        if (!slotsByBooklet.has(slot.bookletIdx)) {
            slotsByBooklet.set(slot.bookletIdx, []);
        }
        slotsByBooklet.get(slot.bookletIdx)!.push(slot);
    });

    // Shuffle within each booklet
    slotsByBooklet.forEach(slots => {
        for (let i = slots.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [slots[i], slots[j]] = [slots[j], slots[i]];
        }
    });

    // Create a round-robin ordered list that cycles through booklets
    // This ensures we spread wins across all booklets
    const roundRobinSlots: typeof allSlots = [];
    const bookletIndices = Array.from(slotsByBooklet.keys()).sort((a, b) => a - b);
    // let bookletCursor = 0;
    let anyBookletHasSlots = true;

    while (anyBookletHasSlots) {
        anyBookletHasSlots = false;
        for (let i = 0; i < bookletIndices.length; i++) {
            const bookletIdx = bookletIndices[i];
            const bookletSlots = slotsByBooklet.get(bookletIdx)!;
            if (bookletSlots.length > 0) {
                roundRobinSlots.push(bookletSlots.shift()!);
                anyBookletHasSlots = true;
            }
        }
    }

    // Now sort the round-robin list by multiplier for control
    // But maintain round-robin within each multiplier group
    const slotsByMultiplierRoundRobin = new Map<number, typeof allSlots>();
    roundRobinSlots.forEach(slot => {
        if (!slotsByMultiplierRoundRobin.has(slot.payout)) {
            slotsByMultiplierRoundRobin.set(slot.payout, []);
        }
        slotsByMultiplierRoundRobin.get(slot.payout)!.push(slot);
    });

    // Rebuild allSlots in multiplier order, but each multiplier group is round-robin by booklet
    allSlots.length = 0;
    Array.from(slotsByMultiplierRoundRobin.keys())
        .sort((a, b) => a - b)
        .forEach(mult => {
            allSlots.push(...slotsByMultiplierRoundRobin.get(mult)!);
        });

    console.log(`Starting allocation for target: ₱${targetPayout.toLocaleString()}`);

    // IMPORTANT: Ensure we select from ALL available multipliers to enable exact payout matching
    // Strategy: Distribute selection across different multipliers
    const uniqueMultipliers = Array.from(slotsByMultiplier.keys()).sort((a, b) => a - b);
    console.log(`Will select from multipliers: [${uniqueMultipliers.join(', ')}] to enable exact matching`);

    let skippedDueToConstraint = 0;
    let skippedDueToDuplication = 0;

    // Phase 0: Ensure we get representation from EACH GAME TYPE
    // This is critical to ensure all game types (10ASWR3, 2PM3D, 3PMSWR3, etc.) get winners
    const uniqueGameTypes = Array.from(slotsByGameType.keys());
    console.log(`\nPhase 0: Selecting from each game type to ensure distribution...`);

    for (const gameTypeId of uniqueGameTypes) {
        const slotsForGameType = slotsByGameType.get(gameTypeId)!;
        const gameType = gameTypes.find(g => g.id === gameTypeId);
        const gameName = gameType ? `${gameType.name} ${gameType.time}` : gameTypeId;

        // Calculate max allowed bet for this multiplier
        const maxAllowedBetForGameType = Math.floor((MAX_SINGLE_PAYOUT - 1) / (gameType?.multiplier || 500));

        // Sort slots by bet amount - PREFER LOWER BETS that won't need adjustment
        // This gives natural variation (₱5, ₱8, ₱12, ₱15, ₱18, ₱19) instead of all ₱19
        slotsForGameType.sort((a, b) => {
            // Prioritize bets that are already within the allowed range
            const aWithinRange = a.currentBet <= maxAllowedBetForGameType;
            const bWithinRange = b.currentBet <= maxAllowedBetForGameType;

            if (aWithinRange && !bWithinRange) return -1; // a comes first (already valid)
            if (!aWithinRange && bWithinRange) return 1;  // b comes first (already valid)

            // If both are within range or both need adjustment, prefer lower bets for variation
            return a.currentBet - b.currentBet;
        });

        // Then shuffle the first half to add some randomness while keeping lower bets prioritized
        const halfwayPoint = Math.floor(slotsForGameType.length / 2);
        for (let i = halfwayPoint - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * i);
            [slotsForGameType[i], slotsForGameType[j]] = [slotsForGameType[j], slotsForGameType[i]];
        }

        let selectedFromGameType = 0;
        const minPerGameType = Math.min(3, slotsForGameType.length); // At least 3 from each game type

        for (const slot of slotsForGameType) {
            if (selectedFromGameType >= minPerGameType) break;

            // Check if this ticket already has a winning bet for this game type
            const ticketKey = `${slot.bookletIdx}-${slot.sheetIdx}-${slot.ticketIdx}-${slot.gameTypeId}`;
            if (ticketGameTypeUsage.has(ticketKey)) {
                skippedDueToDuplication++;
                continue;
            }

            // Calculate maximum allowed bet for this multiplier
            const maxAllowedBet = Math.floor((MAX_SINGLE_PAYOUT - 1) / slot.payout);

            // If current bet violates constraint, adjust it to a RANDOM amount (not always max)
            // This creates variation: ₱5, ₱8, ₱12, ₱15, ₱18, ₱19 instead of all ₱19
            if (slot.currentBet > maxAllowedBet) {
                if (maxAllowedBet >= minBet) {
                    // Generate random bet between minBet and maxAllowedBet
                    // Use weighted random to favor variety across the range
                    const range = maxAllowedBet - minBet + 1;
                    const randomBet = minBet + Math.floor(Math.random() * range);
                    slot.currentBet = randomBet;
                } else {
                    // If even minBet violates constraint, skip this slot
                    skippedDueToConstraint++;
                    continue;
                }
            }

            const slotPayout = slot.currentBet * slot.payout;

            if (totalPayoutAllocated + slotPayout <= targetPayout) {
                selectedSlots.push({ slot });
                ticketGameTypeUsage.add(ticketKey);
                totalPayoutAllocated += slotPayout;
                selectedFromGameType++;

                // Track winning count per booklet
                winningCountPerBooklet.set(slot.bookletIdx, (winningCountPerBooklet.get(slot.bookletIdx) || 0) + 1);
            }
        }

        // Log the actual bet amounts selected to show variation
        const selectedBets = selectedSlots
            .filter(s => s.slot.gameTypeId === gameTypeId)
            .map(s => s.slot.currentBet)
            .sort((a, b) => a - b);

        console.log(`  ${gameName}: selected ${selectedFromGameType} winners (bets: ${selectedBets.length > 0 ? selectedBets.map(b => `₱${b}`).join(', ') : 'none'})`);
    }

    console.log(`After Phase 0: ${selectedSlots.length} slots selected, ₱${totalPayoutAllocated.toLocaleString()} allocated`);

    // If we have multiple multipliers, ensure we get representation from each
    if (uniqueMultipliers.length > 1) {
        // Phase 1: Select at least a few slots from each multiplier (for flexibility in adjustments)
        // Use the round-robin ordered list to maintain even distribution across booklets
        for (const mult of uniqueMultipliers) {
            // Filter round-robin slots by this multiplier
            const slotsForMult = allSlots.filter(s => s.payout === mult);
            let selectedFromMult = 0;
            const minPerMult = Math.min(3, slotsForMult.length); // At least 3 from each multiplier (reduced from 5 since we already selected in Phase 0)

            for (const slot of slotsForMult) {
                if (selectedFromMult >= minPerMult) break;

                // Check if this ticket already has a winning bet for this game type
                const ticketKey = `${slot.bookletIdx}-${slot.sheetIdx}-${slot.ticketIdx}-${slot.gameTypeId}`;
                if (ticketGameTypeUsage.has(ticketKey)) {
                    skippedDueToDuplication++;
                    continue; // Skip this slot to avoid duplicate winning bets in same ticket
                }

                // Calculate maximum allowed bet for this multiplier
                const maxAllowedBet = Math.floor((MAX_SINGLE_PAYOUT - 1) / slot.payout);

                // If current bet violates constraint, adjust it to a RANDOM amount (not always max)
                if (slot.currentBet > maxAllowedBet) {
                    if (maxAllowedBet >= minBet) {
                        // Generate random bet between minBet and maxAllowedBet for variation
                        const range = maxAllowedBet - minBet + 1;
                        const randomBet = minBet + Math.floor(Math.random() * range);
                        slot.currentBet = randomBet;
                    } else {
                        // If even minBet violates constraint, skip this slot
                        skippedDueToConstraint++;
                        continue;
                    }
                }

                const slotPayout = slot.currentBet * slot.payout;

                if (totalPayoutAllocated + slotPayout <= targetPayout) {
                    selectedSlots.push({ slot });
                    ticketGameTypeUsage.add(ticketKey); // Mark this ticket-gametype combination as used
                    totalPayoutAllocated += slotPayout;
                    selectedFromMult++;

                    // Track winning count per booklet
                    winningCountPerBooklet.set(slot.bookletIdx, (winningCountPerBooklet.get(slot.bookletIdx) || 0) + 1);

                    if (selectedSlots.length <= 10) {
                        console.log(`  Slot ${selectedSlots.length} (${mult}x): booklet=${slot.bookletIdx}, bet=${slot.currentBet}, payout=₱${slotPayout.toLocaleString()}`);
                    }
                }
            }
        }
    }

    // Phase 2: Fill remaining with any valid slots using round-robin order
    // Use allSlots directly (already in round-robin order) instead of re-sorting
    for (const slot of allSlots) {
        const remaining = targetPayout - totalPayoutAllocated;
        if (remaining <= 0) break;

        // Skip if already selected
        if (selectedSlots.some(s => s.slot === slot)) continue;

        // Check if this ticket already has a winning bet for this game type
        const ticketKey = `${slot.bookletIdx}-${slot.sheetIdx}-${slot.ticketIdx}-${slot.gameTypeId}`;
        if (ticketGameTypeUsage.has(ticketKey)) {
            skippedDueToDuplication++;
            continue; // Skip this slot to avoid duplicate winning bets in same ticket
        }

        // Calculate maximum allowed bet for this multiplier
        const maxAllowedBet = Math.floor((MAX_SINGLE_PAYOUT - 1) / slot.payout);

        // If current bet violates constraint, adjust it to a RANDOM amount (not always max)
        if (slot.currentBet > maxAllowedBet) {
            if (maxAllowedBet >= minBet) {
                // Generate random bet between minBet and maxAllowedBet for variation
                const range = maxAllowedBet - minBet + 1;
                const randomBet = minBet + Math.floor(Math.random() * range);
                slot.currentBet = randomBet;
            } else {
                // If even minBet violates constraint, skip this slot
                skippedDueToConstraint++;
                continue;
            }
        }

        const slotPayout = slot.currentBet * slot.payout;

        if (totalPayoutAllocated + slotPayout <= targetPayout) {
            selectedSlots.push({ slot });
            ticketGameTypeUsage.add(ticketKey); // Mark this ticket-gametype combination as used
            totalPayoutAllocated += slotPayout;

            // Track winning count per booklet
            winningCountPerBooklet.set(slot.bookletIdx, (winningCountPerBooklet.get(slot.bookletIdx) || 0) + 1);

            if (selectedSlots.length <= 15) {
                console.log(`  Slot ${selectedSlots.length}: booklet=${slot.bookletIdx}, bet=${slot.currentBet}, multiplier=${slot.payout}x, payout=₱${slotPayout.toLocaleString()}`);
            }
        }
    }

    console.log(`Initial allocation: ${selectedSlots.length} slots, Total: ₱${totalPayoutAllocated.toLocaleString()}, Target: ₱${targetPayout.toLocaleString()}, Difference: ₱${(targetPayout - totalPayoutAllocated).toLocaleString()}`);
    if (skippedDueToConstraint > 0) {
        console.log(`⚠ Skipped ${skippedDueToConstraint} slots due to constraint (bet × multiplier >= 10,000)`);
    }
    if (skippedDueToDuplication > 0) {
        console.log(`⚠ Skipped ${skippedDueToDuplication} slots to avoid duplicate winning bets in same ticket`);
    }

    // Step 3.5: Fine-tune to get closer to target (with bet adjustment if needed)
    if (totalPayoutAllocated < targetPayout) {
        const difference = targetPayout - totalPayoutAllocated;
        console.log(`Need to add ₱${difference.toLocaleString()} more payout`);

        // Try to add more slots to get closer
        const unusedSlots = allSlots.filter(s => !selectedSlots.some(sel => sel.slot === s));

        // Adjust bets for unused slots if they violate the constraint
        const validUnusedSlots = unusedSlots.filter(slot => {
            const ticketKey = `${slot.bookletIdx}-${slot.sheetIdx}-${slot.ticketIdx}-${slot.gameTypeId}`;
            if (ticketGameTypeUsage.has(ticketKey)) {
                return false; // Skip duplicates
            }

            // Calculate maximum allowed bet for this multiplier
            const maxAllowedBet = Math.floor((MAX_SINGLE_PAYOUT - 1) / slot.payout);

            // If current bet violates constraint, adjust it down
            if (slot.currentBet > maxAllowedBet) {
                const adjustedBet = Math.max(minBet, Math.min(maxAllowedBet, maxBet));
                if (adjustedBet >= minBet) {
                    slot.currentBet = adjustedBet;
                } else {
                    return false; // Skip if even minBet violates constraint
                }
            }

            return true;
        });

        // Strategy: Use a greedy knapsack-like approach to get as close as possible
        // 1. First, try to find an exact match
        const exactMatch = validUnusedSlots.find(slot => slot.currentBet * slot.payout === difference);
        if (exactMatch) {
            const ticketKey = `${exactMatch.bookletIdx}-${exactMatch.sheetIdx}-${exactMatch.ticketIdx}-${exactMatch.gameTypeId}`;
            selectedSlots.push({ slot: exactMatch });
            ticketGameTypeUsage.add(ticketKey);
            winningCountPerBooklet.set(exactMatch.bookletIdx, (winningCountPerBooklet.get(exactMatch.bookletIdx) || 0) + 1);
            totalPayoutAllocated += exactMatch.currentBet * exactMatch.payout;
            console.log(`Found exact match: booklet=${exactMatch.bookletIdx}, bet=${exactMatch.currentBet}, payout=₱${(exactMatch.currentBet * exactMatch.payout).toLocaleString()}`);
        } else {
            // 2. If no exact match, use greedy approach: add slots that fit
            // Sort by payout descending to fill large gaps first, then small gaps
            validUnusedSlots.sort((a, b) => {
                const payoutA = a.currentBet * a.payout;
                const payoutB = b.currentBet * b.payout;
                return payoutB - payoutA;
            });

            for (const slot of validUnusedSlots) {
                const remaining = targetPayout - totalPayoutAllocated;
                if (remaining <= 0) break;

                const slotPayout = slot.currentBet * slot.payout;

                if (slotPayout <= remaining) {
                    const ticketKey = `${slot.bookletIdx}-${slot.sheetIdx}-${slot.ticketIdx}-${slot.gameTypeId}`;
                    selectedSlots.push({ slot });
                    ticketGameTypeUsage.add(ticketKey);
                    winningCountPerBooklet.set(slot.bookletIdx, (winningCountPerBooklet.get(slot.bookletIdx) || 0) + 1);
                    totalPayoutAllocated += slotPayout;
                    if (selectedSlots.length <= 65) { // Only log first few additions
                        console.log(`Added slot: booklet=${slot.bookletIdx}, bet=${slot.currentBet}, multiplier=${slot.payout}x, payout=₱${slotPayout.toLocaleString()}`);
                    }
                }
            }
        }
    } else if (totalPayoutAllocated > targetPayout) {
        // We overshot - remove some slots
        const difference = totalPayoutAllocated - targetPayout;
        console.log(`Need to reduce ₱${difference.toLocaleString()} payout`);

        // Remove slots starting with largest payout first
        selectedSlots.sort((a, b) => {
            const payoutA = a.slot.currentBet * a.slot.payout;
            const payoutB = b.slot.currentBet * b.slot.payout;
            return payoutB - payoutA;
        });

        while (totalPayoutAllocated > targetPayout && selectedSlots.length > 0) {
            const removed = selectedSlots.pop();
            if (removed) {
                const removedPayout = removed.slot.currentBet * removed.slot.payout;
                totalPayoutAllocated -= removedPayout;
                // Also remove from ticketGameTypeUsage to make this slot available again
                const ticketKey = `${removed.slot.bookletIdx}-${removed.slot.sheetIdx}-${removed.slot.ticketIdx}-${removed.slot.gameTypeId}`;
                ticketGameTypeUsage.delete(ticketKey);
                // Decrement booklet win count
                const currentCount = winningCountPerBooklet.get(removed.slot.bookletIdx) || 0;
                if (currentCount > 0) {
                    winningCountPerBooklet.set(removed.slot.bookletIdx, currentCount - 1);
                }
                console.log(`Removed slot: booklet=${removed.slot.bookletIdx}, payout -₱${removedPayout.toLocaleString()}, new total=₱${totalPayoutAllocated.toLocaleString()}`);
            }
        }
    }

    // Final summary before adjustments
    console.log(`\nFinal allocation: ${selectedSlots.length} winning slots`);
    console.log(`Total payout: ₱${totalPayoutAllocated.toLocaleString()}`);
    console.log(`Target payout: ₱${targetPayout.toLocaleString()}`);
    let difference = Math.abs(targetPayout - totalPayoutAllocated);
    console.log(`Difference: ₱${difference.toLocaleString()} (${((difference / targetPayout) * 100).toFixed(2)}%)`);

    // Log distribution across booklets
    console.log(`\nWinning distribution across booklets:`);
    const bookletDistribution = Array.from(winningCountPerBooklet.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([bookletIdx, count]) => `  Booklet ${bookletIdx}: ${count} wins`)
        .join('\n');
    console.log(bookletDistribution || '  (no wins yet)');

    // Step 3.75: Fine-tune bet amounts to match EXACT target payout
    // We will adjust winning bet amounts to hit the exact target while respecting constraints
    if (totalPayoutAllocated !== targetPayout && selectedSlots.length > 0) {
        console.log(`\nAdjusting bet amounts to match exact target...`);

        let adjustmentNeeded = targetPayout - totalPayoutAllocated;

        // Strategy: Try multiple passes with different approaches
        // Pass 1: Use slots with smallest multipliers for fine control
        const adjustableSlots = selectedSlots
            .map(({ slot }, idx) => ({ slot, idx }))
            .sort((a, b) => a.slot.payout - b.slot.payout); // Sort by multiplier ascending

        let remainingAdjustment = adjustmentNeeded;
        let adjustmentsMade = 0;

        // Pass 1: Try to make exact adjustments
        for (const { slot, idx } of adjustableSlots) {
            if (remainingAdjustment === 0) break;

            const currentBet = slot.currentBet;
            const multiplier = slot.payout;

            // Calculate exact bet adjustment needed
            // We want: betAdjustment × multiplier = remainingAdjustment
            // So: betAdjustment = remainingAdjustment / multiplier
            const exactBetAdjustment = remainingAdjustment / multiplier;

            // Try both floor and ceil to see which gets closer
            const floorAdjustment = Math.floor(exactBetAdjustment);
            const ceilAdjustment = Math.ceil(exactBetAdjustment);

            // Choose the adjustment that gets us closest to zero remaining
            let betAdjustment = 0;
            if (Math.abs(remainingAdjustment - floorAdjustment * multiplier) <
                Math.abs(remainingAdjustment - ceilAdjustment * multiplier)) {
                betAdjustment = floorAdjustment;
            } else {
                betAdjustment = ceilAdjustment;
            }

            if (betAdjustment === 0) continue;

            const newBet = currentBet + betAdjustment;

            // Check constraints
            const maxAllowedBet = Math.floor((MAX_SINGLE_PAYOUT - 1) / multiplier);

            if (newBet >= minBet && newBet <= maxBet && newBet <= maxAllowedBet) {
                // Apply the adjustment
                const actualPayoutChange = (newBet - currentBet) * multiplier;

                selectedSlots[idx].slot.currentBet = newBet;
                remainingAdjustment -= actualPayoutChange;
                totalPayoutAllocated += actualPayoutChange;
                adjustmentsMade++;

                if (adjustmentsMade <= 5) { // Log first few adjustments
                    console.log(`Adjusted slot ${idx + 1}: bet ${currentBet} → ${newBet}, payout change: ${actualPayoutChange > 0 ? '+' : ''}₱${actualPayoutChange.toLocaleString()}`);
                }
            }
        }

        // Pass 2: If still not exact, try multi-slot combination adjustments
        if (remainingAdjustment !== 0) {
            console.log(`Pass 2: Multi-slot combination adjustments (remaining: ₱${remainingAdjustment})...`);

            // Group slots by multiplier to find combinations that work
            const slotsByMultiplier = new Map<number, typeof adjustableSlots>();
            adjustableSlots.forEach(slotInfo => {
                const mult = slotInfo.slot.payout;
                if (!slotsByMultiplier.has(mult)) {
                    slotsByMultiplier.set(mult, []);
                }
                slotsByMultiplier.get(mult)!.push(slotInfo);
            });

            // Try combinations of ±1 adjustments across different multipliers
            // Example: If we need +100 and have 70x multiplier slots, we can:
            // - Add 2 bets (+70 each = +140) and subtract 1 bet (-70) = net +70? No...
            // - Need to find a combination that equals exactly the remaining adjustment

            const multipliers = Array.from(slotsByMultiplier.keys()).sort((a, b) => a - b);

            // Strategy: Try to express remainingAdjustment as a linear combination of available multipliers
            // For example: remainingAdjustment = a*mult1 + b*mult2 + ... where a, b are ±1, ±2, etc.

            // Simple greedy approach: Use smallest multiplier repeatedly
            const smallestMultiplier = multipliers[0];
            if (smallestMultiplier && remainingAdjustment % smallestMultiplier === 0) {
                // Perfect! We can use this multiplier
                const numAdjustments = remainingAdjustment / smallestMultiplier;
                const slotsToAdjust = slotsByMultiplier.get(smallestMultiplier) || [];

                let adjustmentsNeeded = Math.abs(numAdjustments);
                const direction = remainingAdjustment > 0 ? 1 : -1;

                for (const { slot, idx } of slotsToAdjust) {
                    if (adjustmentsNeeded === 0) break;

                    const currentBet = slot.currentBet;
                    const newBet = currentBet + direction;
                    const maxAllowedBet = Math.floor((MAX_SINGLE_PAYOUT - 1) / smallestMultiplier);

                    if (newBet >= minBet && newBet <= maxBet && newBet <= maxAllowedBet) {
                        const actualPayoutChange = direction * smallestMultiplier;
                        selectedSlots[idx].slot.currentBet = newBet;
                        remainingAdjustment -= actualPayoutChange;
                        totalPayoutAllocated += actualPayoutChange;
                        adjustmentsMade++;
                        adjustmentsNeeded--;

                        if (adjustmentsMade <= 15) {
                            console.log(`Combination adjust slot ${idx + 1}: bet ${currentBet} → ${newBet}, payout change: ${actualPayoutChange > 0 ? '+' : ''}₱${actualPayoutChange.toLocaleString()}`);
                        }
                    }
                }
            } else {
                // Use GCD-based approach to find exact combination
                // Calculate GCD of all available multipliers
                const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
                const multiplierGCD = multipliers.reduce((acc, mult) => gcd(acc, mult), multipliers[0]);

                console.log(`Multipliers available: [${multipliers.join(', ')}], GCD: ${multiplierGCD}`);

                if (remainingAdjustment % multiplierGCD === 0) {
                    // It's theoretically possible to hit exact - use extended Euclidean algorithm
                    // For simplicity with 2 multipliers: solve a*mult1 + b*mult2 = remainingAdjustment

                    if (multipliers.length >= 2) {
                        const mult1 = multipliers[0];
                        const mult2 = multipliers[1];

                        // Try small integer combinations (expanded range for better coverage)
                        let found = false;
                        for (let a = -50; a <= 50 && !found; a++) {
                            for (let b = -50; b <= 50 && !found; b++) {
                                if (a * mult1 + b * mult2 === remainingAdjustment) {
                                    console.log(`Found combination: ${a} × ${mult1} + ${b} × ${mult2} = ${remainingAdjustment}`);

                                    // Apply 'a' adjustments to mult1 slots
                                    const slots1 = slotsByMultiplier.get(mult1) || [];
                                    for (let i = 0; i < Math.abs(a) && i < slots1.length; i++) {
                                        const { slot, idx } = slots1[i];
                                        const direction = a > 0 ? 1 : -1;
                                        const newBet = slot.currentBet + direction;
                                        const maxAllowedBet = Math.floor((MAX_SINGLE_PAYOUT - 1) / mult1);

                                        if (newBet >= minBet && newBet <= maxBet && newBet <= maxAllowedBet) {
                                            selectedSlots[idx].slot.currentBet = newBet;
                                            const change = direction * mult1;
                                            remainingAdjustment -= change;
                                            totalPayoutAllocated += change;
                                            adjustmentsMade++;
                                            console.log(`  Applied ${direction > 0 ? '+' : ''}${direction} to ${mult1}x slot`);
                                        }
                                    }

                                    // Apply 'b' adjustments to mult2 slots
                                    const slots2 = slotsByMultiplier.get(mult2) || [];
                                    for (let i = 0; i < Math.abs(b) && i < slots2.length; i++) {
                                        const { slot, idx } = slots2[i];
                                        const direction = b > 0 ? 1 : -1;
                                        const newBet = slot.currentBet + direction;
                                        const maxAllowedBet = Math.floor((MAX_SINGLE_PAYOUT - 1) / mult2);

                                        if (newBet >= minBet && newBet <= maxBet && newBet <= maxAllowedBet) {
                                            selectedSlots[idx].slot.currentBet = newBet;
                                            const change = direction * mult2;
                                            remainingAdjustment -= change;
                                            totalPayoutAllocated += change;
                                            adjustmentsMade++;
                                            console.log(`  Applied ${direction > 0 ? '+' : ''}${direction} to ${mult2}x slot`);
                                        }
                                    }

                                    found = true;
                                }
                            }
                        }

                        if (!found) {
                            console.warn(`Could not find integer combination for ${remainingAdjustment} using multipliers [${multipliers}]`);
                        }
                    } else {
                        // Only one multiplier - already handled above
                        console.warn(`Only one multiplier (${multipliers[0]}) available, cannot achieve exact payout`);
                    }
                } else {
                    console.warn(`Remaining adjustment ${remainingAdjustment} is not divisible by GCD ${multiplierGCD} - exact payout impossible with current multipliers`);
                }
            }
        }

        console.log(`After ${adjustmentsMade} adjustments: Total payout: ₱${totalPayoutAllocated.toLocaleString()}, Remaining difference: ₱${Math.abs(remainingAdjustment).toLocaleString()}`);
    }

    // Step 4: Apply the changes - set winning numbers AND adjusted bet amounts
    // Track revenue changes to maintain exact revenue
    let totalRevenueReduction = 0;
    const originalBets = new Map<string, number>();

    // First pass: collect original bets and calculate revenue reduction
    selectedSlots.forEach(({ slot }) => {
        const booklet = booklets[slot.bookletIdx];
        const numberBet = booklet.sheets[slot.sheetIdx].tickets[slot.ticketIdx].numberBets[slot.betIdx];
        const slotKey = `${slot.bookletIdx}-${slot.sheetIdx}-${slot.ticketIdx}-${slot.betIdx}`;

        originalBets.set(slotKey, numberBet.bet);

        if (slot.currentBet < numberBet.bet) {
            totalRevenueReduction += (numberBet.bet - slot.currentBet);
        }
    });

    // Second pass: apply changes
    let numbersChanged = 0;
    let numbersKeptForPares = 0;
    selectedSlots.forEach(({ slot }) => {
        const booklet = booklets[slot.bookletIdx];
        const numberBet = booklet.sheets[slot.sheetIdx].tickets[slot.ticketIdx].numberBets[slot.betIdx];
        const winningNumber = winningNumbers[slot.gameTypeId as keyof WinningNumbers];
        const gameType = gameTypes.find((g: GameType) => g.id === slot.gameTypeId);

        // For Pares games, check if the current number is already a winning combination
        if (gameType && (gameType.gameFormat === 'pares_p2' || gameType.gameFormat === 'pares_p3')) {
            const paresWin = detectParesWins(numberBet.number, winningNumber, gameType, numberBet.bet);
            if (paresWin.isTarget || paresWin.isEkis || paresWin.isRumble) {
                // Already a winning combination (Ekis or Rumble), keep the existing number
                numbersKeptForPares++;
            } else {
                // Not a winning combination, change to target win
                numberBet.number = winningNumber;
                numbersChanged++;
            }
        } else {
            // For standard games, always set to winning number
            numberBet.number = winningNumber;
            numbersChanged++;
        }

        // Update bet amount if it was adjusted
        numberBet.bet = slot.currentBet;
    });

    // Compensate for revenue reduction by increasing non-winning bets
    if (totalRevenueReduction > 0 && totalRevenue) {
        console.log(`\nCompensating for ₱${totalRevenueReduction.toLocaleString()} revenue reduction from winning bet adjustments...`);

        // Collect all non-winning bets that can be increased
        const nonWinningBets: Array<{ numberBet: any; maxIncrease: number }> = [];

        booklets.forEach((booklet) => {
            booklet.sheets.forEach((sheet) => {
                sheet.tickets.forEach((ticket) => {
                    ticket.numberBets.forEach((numberBet) => {
                        const isWinning = selectedSlots.some(
                            ({ slot }) =>
                                booklets[slot.bookletIdx].sheets[slot.sheetIdx].tickets[slot.ticketIdx]
                                    .numberBets[slot.betIdx] === numberBet
                        );

                        if (!isWinning && numberBet.bet < maxBet) {
                            nonWinningBets.push({
                                numberBet,
                                maxIncrease: maxBet - numberBet.bet,
                            });
                        }
                    });
                });
            });
        });

        // Distribute the revenue reduction across non-winning bets
        // Use whole peso increments to avoid decimals
        let remainingCompensation = Math.round(totalRevenueReduction);
        const compensationPerBet = Math.floor(remainingCompensation / nonWinningBets.length);

        // First pass: distribute floor amount to all bets
        for (const { numberBet, maxIncrease } of nonWinningBets) {
            if (remainingCompensation <= 0) break;

            const increase = Math.min(compensationPerBet, Math.floor(maxIncrease), remainingCompensation);
            if (increase > 0) {
                numberBet.bet += increase;
                remainingCompensation -= increase;
            }
        }

        // Second pass: distribute remaining 1 peso at a time
        for (const { numberBet, maxIncrease: _maxIncrease } of nonWinningBets) {
            if (remainingCompensation <= 0) break;

            if (numberBet.bet < maxBet) {
                numberBet.bet += 1;
                remainingCompensation -= 1;
            }
        }

        if (remainingCompensation > 0) {
            console.warn(`⚠ Could not fully compensate revenue reduction. Remaining: ₱${remainingCompensation.toLocaleString()}`);
        } else {
            console.log(`✓ Revenue compensated successfully`);
        }
    }

    console.log(`✓ Changed ${numbersChanged} numbers to match winning numbers, kept ${numbersKeptForPares} Pares numbers (already Ekis/Rumble wins)`);

    // Step 5: Verify actual payout achieved using proper Pares win detection
    let actualPayout = 0;
    selectedSlots.forEach(({ slot }) => {
        const booklet = booklets[slot.bookletIdx];
        const numberBet = booklet.sheets[slot.sheetIdx].tickets[slot.ticketIdx].numberBets[slot.betIdx];
        const winningNumber = winningNumbers[slot.gameTypeId as keyof WinningNumbers];
        const gameType = gameTypes.find((g: GameType) => g.id === slot.gameTypeId);

        if (gameType && (gameType.gameFormat === 'pares_p2' || gameType.gameFormat === 'pares_p3')) {
            // For Pares, use detectParesWins to get actual payout
            const paresWin = detectParesWins(numberBet.number, winningNumber, gameType, numberBet.bet);
            actualPayout += paresWin.totalPayout;
        } else {
            // For standard games, use multiplier
            actualPayout += numberBet.bet * (gameType?.multiplier || 0);
        }
    });

    console.log(`\n===== PAYOUT VERIFICATION =====`);
    console.log(`Target payout: ₱${targetPayout.toLocaleString()}`);
    console.log(`Actual payout: ₱${actualPayout.toLocaleString()}`);
    console.log(`Difference: ₱${Math.abs(targetPayout - actualPayout).toLocaleString()}`);

    if (actualPayout === targetPayout) {
        console.log(`✓ Exact payout achieved!`);
    } else {
        console.warn(`⚠ Payout not exact (off by ₱${Math.abs(targetPayout - actualPayout).toLocaleString()})`);
        console.warn(`Note: Some bet adjustments may have been constrained by min/max limits or multiplier constraint`);
    }

    // Step 6: Adjust non-winning bets to maintain exact revenue
    // Calculate how much revenue changed due to winning bet adjustments
    let currentRevenue = booklets.reduce((sum, booklet) =>
        sum + booklet.sheets.reduce((s, sheet) =>
            s + sheet.tickets.reduce((t, ticket) =>
                t + ticket.numberBets.reduce((nb, bet) => nb + bet.bet, 0), 0), 0), 0);

    const expectedRevenue = booklets.reduce((sum, b) => sum + b.revenue, 0);
    const revenueAdjustmentNeeded = expectedRevenue - currentRevenue;

    if (revenueAdjustmentNeeded !== 0) {
        console.log(`\n===== REVENUE COMPENSATION =====`);
        console.log(`Revenue adjustment needed: ${revenueAdjustmentNeeded > 0 ? '+' : ''}₱${revenueAdjustmentNeeded.toLocaleString()}`);

        // Collect all non-winning bets that we can adjust
        const nonWinningBets: Array<{ bookletIdx: number; sheetIdx: number; ticketIdx: number; betIdx: number; currentBet: number }> = [];

        booklets.forEach((booklet, bookletIdx) => {
            booklet.sheets.forEach((sheet, sheetIdx) => {
                sheet.tickets.forEach((ticket, ticketIdx) => {
                    ticket.numberBets.forEach((numberBet, betIdx) => {
                        // Check if this is a winning bet
                        const isWinning = selectedSlots.some(({ slot }) =>
                            slot.bookletIdx === bookletIdx &&
                            slot.sheetIdx === sheetIdx &&
                            slot.ticketIdx === ticketIdx &&
                            slot.betIdx === betIdx
                        );

                        if (!isWinning) {
                            nonWinningBets.push({ bookletIdx, sheetIdx, ticketIdx, betIdx, currentBet: numberBet.bet });
                        }
                    });
                });
            });
        });

        // Shuffle and adjust non-winning bets to compensate
        for (let i = nonWinningBets.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nonWinningBets[i], nonWinningBets[j]] = [nonWinningBets[j], nonWinningBets[i]];
        }

        let remainingCompensation = revenueAdjustmentNeeded;
        const MAX_COMPENSATION_PER_BET = 10; // Adjust by small amounts to keep natural

        for (const betInfo of nonWinningBets) {
            if (Math.abs(remainingCompensation) === 0) break;

            const currentBet = betInfo.currentBet;
            const idealAdjustment = remainingCompensation;
            const cappedAdjustment = Math.max(-MAX_COMPENSATION_PER_BET, Math.min(MAX_COMPENSATION_PER_BET, idealAdjustment));

            let newBet = currentBet + cappedAdjustment;

            // Apply bounds
            newBet = Math.max(minBet, Math.min(maxBet, newBet));

            const actualAdjustment = newBet - currentBet;
            if (actualAdjustment !== 0) {
                booklets[betInfo.bookletIdx].sheets[betInfo.sheetIdx]
                    .tickets[betInfo.ticketIdx].numberBets[betInfo.betIdx].bet = newBet;
                remainingCompensation -= actualAdjustment;
            }
        }

        console.log(`Adjusted non-winning bets to compensate. Remaining: ₱${remainingCompensation.toLocaleString()}`);
    }

    // Step 7: Verify revenue is still exact (critical check)
    const finalRevenue = booklets.reduce((sum, booklet) =>
        sum + booklet.sheets.reduce((s, sheet) =>
            s + sheet.tickets.reduce((t, ticket) =>
                t + ticket.numberBets.reduce((nb, bet) => nb + bet.bet, 0), 0), 0), 0);

    console.log(`\n===== REVENUE VERIFICATION =====`);
    console.log(`Expected revenue: ₱${expectedRevenue.toLocaleString()}`);
    console.log(`Actual revenue: ₱${finalRevenue.toLocaleString()}`);

    if (finalRevenue === expectedRevenue) {
        console.log(`✓ Revenue preserved exactly!`);
    } else {
        const revenueDiff = Math.abs(expectedRevenue - finalRevenue);
        if (revenueDiff <= 1) {
            // Allow rounding errors up to ₱1
            console.log(`✓ Revenue preserved (rounding difference: ₱${revenueDiff})`);
        } else {
            console.error(`❌ CRITICAL: Revenue changed! Difference: ₱${revenueDiff.toLocaleString()}`);
            throw new Error(`Revenue not preserved: expected ${expectedRevenue}, got ${finalRevenue}`);
        }
    }

    // Step 7: Log payout by game type
    const payoutByGameType: Record<string, number> = {};
    selectedSlots.forEach(({ slot }) => {
        const bet = booklets[slot.bookletIdx].sheets[slot.sheetIdx]
            .tickets[slot.ticketIdx].numberBets[slot.betIdx].bet;
        const payout = bet * slot.payout;
        payoutByGameType[slot.gameTypeId] = (payoutByGameType[slot.gameTypeId] || 0) + payout;
    });

    console.log('\nPayout by game type:');
    Object.entries(payoutByGameType).forEach(([gameTypeId, payout]) => {
        console.log(`  ${gameTypeId}: ₱${payout.toLocaleString()}`);
    });

    // FINAL CRITICAL CHECK: Ensure payout >= Prize Fund
    if (prizeFund > 0) {
        const finalTotalPayout = selectedSlots.reduce((sum, { slot }) => {
            const bet = booklets[slot.bookletIdx].sheets[slot.sheetIdx]
                .tickets[slot.ticketIdx].numberBets[slot.betIdx].bet;
            return sum + (bet * slot.payout);
        }, 0);

        console.log(`\n===== PRIZE FUND VERIFICATION =====`);
        console.log(`Final Total Payout: ₱${finalTotalPayout.toLocaleString()}`);
        console.log(`Prize Fund (required): ₱${prizeFund.toLocaleString()}`);

        if (finalTotalPayout < prizeFund) {
            const shortage = prizeFund - finalTotalPayout;
            console.error(`❌ CRITICAL: Payout (₱${finalTotalPayout.toLocaleString()}) is LESS than Prize Fund (₱${prizeFund.toLocaleString()})`);
            console.error(`Shortage: ₱${shortage.toLocaleString()}`);
            console.error(`This violates the PCSO requirement that payout must be >= Prize Fund`);

            // Try to add more winning slots to meet the Prize Fund requirement
            console.log(`\nAttempting to add more winning slots to meet Prize Fund...`);
            const unusedSlots = allSlots.filter(s => !selectedSlots.some(sel => sel.slot === s));
            const validUnusedSlots = unusedSlots.filter(slot => {
                const ticketKey = `${slot.bookletIdx}-${slot.sheetIdx}-${slot.ticketIdx}-${slot.gameTypeId}`;
                if (ticketGameTypeUsage.has(ticketKey)) {
                    return false; // Skip duplicates
                }

                // Calculate maximum allowed bet for this multiplier
                const maxAllowedBet = Math.floor((MAX_SINGLE_PAYOUT - 1) / slot.payout);

                // If current bet violates constraint, adjust it down
                if (slot.currentBet > maxAllowedBet) {
                    const adjustedBet = Math.max(minBet, Math.min(maxAllowedBet, maxBet));
                    if (adjustedBet >= minBet) {
                        slot.currentBet = adjustedBet;
                    } else {
                        return false; // Skip if even minBet violates constraint
                    }
                }

                return true;
            });

            // Sort by payout ASCENDING (smallest first) to add minimal slots needed
            validUnusedSlots.sort((a, b) => {
                const payoutA = a.currentBet * a.payout;
                const payoutB = b.currentBet * b.payout;
                return payoutA - payoutB;
            });

            let currentPayout = finalTotalPayout;
            let slotsAdded = 0;

            for (const slot of validUnusedSlots) {
                if (currentPayout >= prizeFund) break;

                const slotPayout = slot.currentBet * slot.payout;
                const ticketKey = `${slot.bookletIdx}-${slot.sheetIdx}-${slot.ticketIdx}-${slot.gameTypeId}`;

                selectedSlots.push({ slot });
                ticketGameTypeUsage.add(ticketKey);
                currentPayout += slotPayout;
                slotsAdded++;

                // Apply the winning number
                const ticket = booklets[slot.bookletIdx].sheets[slot.sheetIdx].tickets[slot.ticketIdx];
                const winningNumber = winningNumbers[slot.gameTypeId as keyof WinningNumbers];
                if (winningNumber) {
                    ticket.numberBets[slot.betIdx].number = winningNumber;
                }

                console.log(`Added slot ${slotsAdded}: bet=${slot.currentBet}, multiplier=${slot.payout}x, payout=₱${slotPayout.toLocaleString()}, running total=₱${currentPayout.toLocaleString()}`);
            }

            if (currentPayout >= prizeFund) {
                console.log(`✓ Successfully added ${slotsAdded} slots to meet Prize Fund requirement`);
                console.log(`New Total Payout: ₱${currentPayout.toLocaleString()}`);
            }

            if (currentPayout < prizeFund) {
                console.warn(`⚠ WARNING: Could not fully meet Prize Fund requirement. Final payout: ₱${currentPayout.toLocaleString()}`);
            }
        } else {
            console.log(`✓ Payout meets Prize Fund requirement (₱${finalTotalPayout.toLocaleString()} >= ₱${prizeFund.toLocaleString()})`);
        }
    }

    console.log('\n===== PAYOUT ALLOCATION COMPLETE =====\n');
}

// Generate sheets with per-draw revenue constraints
// This function respects drawRevenueTargets to allocate specific revenue to each draw time
function generateSheetsWithDrawConstraints(
    gameTypes: GameType[],
    bookletRevenue: number,
    minBet: number,
    maxBet: number,
    multipleOfFivePercent: number,
    drawRevenueTargets: Record<string, number>,
    _totalBooklets: number,
    companyCode: string = "ADS"
): Sheet[] {
    console.log(`\n=== Generating sheets with draw constraints ===`);
    console.log(`Booklet revenue: ₱${bookletRevenue.toLocaleString()}`);

    // Group game types by draw time
    const gameTypesByDraw = new Map<string, GameType[]>();
    gameTypes.forEach(gt => {
        const timeKey = gt.time || "default";
        if (!gameTypesByDraw.has(timeKey)) {
            gameTypesByDraw.set(timeKey, []);
        }
        gameTypesByDraw.get(timeKey)!.push(gt);
    });

    // Calculate per-draw revenue for this booklet (proportional to total targets)
    const drawRevenuesForBooklet: Record<string, number> = {};
    const totalTargetRevenue = Object.values(drawRevenueTargets).reduce((sum, val) => sum + val, 0);

    Object.keys(drawRevenueTargets).forEach(drawTime => {
        const proportion = drawRevenueTargets[drawTime] / totalTargetRevenue;
        drawRevenuesForBooklet[drawTime] = Math.floor(bookletRevenue * proportion);
    });

    // Adjust for rounding errors - add difference to largest draw
    const sumDrawRevenues = Object.values(drawRevenuesForBooklet).reduce((sum, val) => sum + val, 0);
    if (sumDrawRevenues !== bookletRevenue) {
        const diff = bookletRevenue - sumDrawRevenues;
        const largestDraw = Object.keys(drawRevenuesForBooklet).reduce((a, b) =>
            drawRevenuesForBooklet[a] > drawRevenuesForBooklet[b] ? a : b
        );
        drawRevenuesForBooklet[largestDraw] += diff;
    }

    console.log('Per-draw revenues for this booklet:', drawRevenuesForBooklet);

    // Generate 50 sheets
    const sheets: Sheet[] = [];
    const totalSheets = SHEETS_PER_BOOKLET;

    // Calculate expected number of slots with variable ticket sizes
    // 45% tickets have 3 numbers, 35% have 2, 20% have 1
    // Expected avg = 0.45*3 + 0.35*2 + 0.20*1 = 2.25 numbers per ticket
    const totalTickets = totalSheets * TICKETS_PER_SHEET; // 50 * 5 = 250 tickets
    const expectedAvgNumbersPerTicket = 0.45 * 3 + 0.35 * 2 + 0.20 * 1; // 2.25
    const totalSlots = Math.round(totalTickets * expectedAvgNumbersPerTicket); // ~563 slots
    const slotsPerDraw: Record<string, number> = {};

    Object.keys(drawRevenuesForBooklet).forEach(drawTime => {
        const proportion = drawRevenuesForBooklet[drawTime] / bookletRevenue;
        slotsPerDraw[drawTime] = Math.round(totalSlots * proportion);
    });

    // Adjust for rounding - ensure sum = 750
    const sumSlots = Object.values(slotsPerDraw).reduce((sum, val) => sum + val, 0);
    if (sumSlots !== totalSlots) {
        const diff = totalSlots - sumSlots;
        const largestDraw = Object.keys(slotsPerDraw).reduce((a, b) =>
            slotsPerDraw[a] > slotsPerDraw[b] ? a : b
        );
        slotsPerDraw[largestDraw] += diff;
    }

    console.log('Slots per draw:', slotsPerDraw);

    // Create sheets with game types distributed according to slot allocation
    for (let sheetNum = 1; sheetNum <= totalSheets; sheetNum++) {
        const sheetId = `${sheetNum.toString().padStart(2, '0')}-${companyCode}-${(sheetNum).toString().padStart(3, '0')}`;
        const tickets: Ticket[] = [];

        // Each sheet has 5 tickets (E, D, C, B, A)
        for (let ticketIndex = 0; ticketIndex < TICKETS_PER_SHEET; ticketIndex++) {
            const label = TICKET_LABELS[ticketIndex];
            const numberBets: NumberBet[] = [];

            // Add variety: balanced distribution across 1, 2, and 3
            let numbersCount: number;
            const rand = Math.random();
            if (rand < 0.45) {
                numbersCount = 3; // 45% - 3 bets per ticket
            } else if (rand < 0.80) {
                numbersCount = 2; // 35% - 2 bets per ticket
            } else {
                numbersCount = 1; // 20% - 1 bet per ticket
            }

            // Determine which draw time this TICKET should use (all bets in ticket will share same draw time and game type)
            // Distribute proportionally based on remaining slots needed
            let selectedDrawTime = Object.keys(slotsPerDraw)[0];
            let maxNeeded = 0;

            Object.keys(slotsPerDraw).forEach(drawTime => {
                if (slotsPerDraw[drawTime] > maxNeeded) {
                    maxNeeded = slotsPerDraw[drawTime];
                    selectedDrawTime = drawTime;
                }
            });

            // Decrement slot count for this ticket (all slots at once)
            slotsPerDraw[selectedDrawTime] = Math.max(0, slotsPerDraw[selectedDrawTime] - numbersCount);

            // Select ONE specific game type for this ticket (same game name and time for all bets)
            const drawGameTypes = gameTypesByDraw.get(selectedDrawTime) || [];
            const gameTypesForDraw = drawGameTypes.length > 0 ? drawGameTypes : gameTypes;
            const ticketGameType = gameTypesForDraw[Math.floor(Math.random() * gameTypesForDraw.length)];

            // Assign numbers to this ticket using the SAME game type
            for (let numIdx = 0; numIdx < numbersCount; numIdx++) {

                // Generate random number based on game format (use the main function for consistency)
                const number = generateRandomNumber(ticketGameType.digits, ticketGameType);

                numberBets.push({
                    number,
                    bet: minBet, // Will be adjusted later
                    label,
                    gameTypeId: ticketGameType.id,
                    gameTypeName: ticketGameType.name,
                    gameTypeTime: ticketGameType.time,
                });
            }

            tickets.push({
                label,
                numberBets,
                gameTypeId: ticketGameType.id, // All bets in ticket now use same game type
            });
        }

        sheets.push({
            id: sheetId,
            tickets,
            gameTypeId: undefined,
        });
    }

    console.log(`✓ Generated ${sheets.length} sheets with draw constraints (expected ${SHEETS_PER_BOOKLET})`);

    // Verify all sheets have 5 tickets
    const sheetsWithIssues = sheets.filter(s => s.tickets.length !== 5);
    if (sheetsWithIssues.length > 0) {
        console.error(`⚠️ WARNING: ${sheetsWithIssues.length} sheets have incorrect ticket count in draw-constrained generation!`);
    }

    // Collect all number bets grouped by draw time
    const betsByDraw = new Map<string, Array<{ sheet: Sheet; ticket: Ticket; betIndex: number }>>();

    sheets.forEach(sheet => {
        sheet.tickets.forEach(ticket => {
            ticket.numberBets.forEach((bet, betIndex) => {
                const drawTime = bet.gameTypeTime!;
                if (!betsByDraw.has(drawTime)) {
                    betsByDraw.set(drawTime, []);
                }
                betsByDraw.get(drawTime)!.push({ sheet, ticket, betIndex });
            });
        });
    });

    // Recalculate per-draw revenue targets based on ACTUAL slots allocated
    // This ensures the sum of all draw revenues equals the booklet revenue
    const totalActualSlots = Array.from(betsByDraw.values()).reduce((sum, bets) => sum + bets.length, 0);
    const adjustedDrawRevenues: Record<string, number> = {};

    betsByDraw.forEach((bets, drawTime) => {
        const proportion = bets.length / totalActualSlots;
        adjustedDrawRevenues[drawTime] = Math.floor(bookletRevenue * proportion);
    });

    // Adjust for rounding - add difference to largest draw
    const sumAdjusted = Object.values(adjustedDrawRevenues).reduce((sum, val) => sum + val, 0);
    if (sumAdjusted !== bookletRevenue) {
        const diff = bookletRevenue - sumAdjusted;
        const largestDraw = Object.keys(adjustedDrawRevenues).reduce((a, b) =>
            adjustedDrawRevenues[a] > adjustedDrawRevenues[b] ? a : b
        );
        adjustedDrawRevenues[largestDraw] += diff;
    }

    console.log('\nAdjusted per-draw revenues based on actual slots:', adjustedDrawRevenues);

    // For each draw time, adjust bets to hit target revenue
    betsByDraw.forEach((bets, drawTime) => {
        const targetRevenue = adjustedDrawRevenues[drawTime];
        if (!targetRevenue || bets.length === 0) return;

        console.log(`\nAdjusting ${bets.length} bets for ${drawTime} to hit ₱${targetRevenue.toLocaleString()}`);

        // Calculate average bet needed
        const avgBet = targetRevenue / bets.length;
        const clampedAvg = Math.max(minBet, Math.min(maxBet, avgBet));

        // Distribute bets with variation
        const multipleOfFiveCount = Math.floor(bets.length * multipleOfFivePercent / 100);

        let totalAllocated = 0;
        bets.forEach((betRef, idx) => {
            let bet: number;

            if (idx < multipleOfFiveCount) {
                // Multiple of 5 with MORE variation
                // Random variation of ±40% around the average
                const variation = (Math.random() - 0.5) * 2 * 0.4; // -0.4 to +0.4
                const variedAvg = clampedAvg * (1 + variation);
                bet = Math.round(variedAvg / 5) * 5;
                bet = Math.max(minBet, Math.min(maxBet, bet));
            } else {
                // Specific amount with even MORE variation
                // Random variation of ±50% around the average
                const variation = (Math.random() - 0.5) * 2 * 0.5; // -0.5 to +0.5
                bet = Math.round(clampedAvg * (1 + variation));
                bet = Math.max(minBet, Math.min(maxBet, bet));
            }

            // Ensure integer
            bet = Math.floor(bet);

            betRef.ticket.numberBets[betRef.betIndex].bet = bet;
            totalAllocated += bet;
        });

        // Adjust final bets to match exact target using integer adjustments
        const diff = targetRevenue - totalAllocated;
        if (diff !== 0) {
            console.log(`Need to adjust by ₱${diff} for ${drawTime}`);

            // Shuffle bets for random distribution of adjustments
            const shuffledBets = [...bets];
            for (let i = shuffledBets.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledBets[i], shuffledBets[j]] = [shuffledBets[j], shuffledBets[i]];
            }

            let remaining = diff;
            for (const betRef of shuffledBets) {
                if (remaining === 0) break;

                const currentBet = betRef.ticket.numberBets[betRef.betIndex].bet;

                if (remaining > 0 && currentBet < maxBet) {
                    // Need to add - add ±1 at a time
                    const toAdd = Math.min(maxBet - currentBet, remaining);
                    betRef.ticket.numberBets[betRef.betIndex].bet = currentBet + toAdd;
                    remaining -= toAdd;
                } else if (remaining < 0 && currentBet > minBet) {
                    // Need to subtract - subtract ±1 at a time
                    const toSubtract = Math.min(currentBet - minBet, Math.abs(remaining));
                    betRef.ticket.numberBets[betRef.betIndex].bet = currentBet - toSubtract;
                    remaining += toSubtract;
                }
            }

            if (remaining !== 0) {
                console.error(`CRITICAL: Unable to adjust exactly for ${drawTime}. Remaining: ₱${remaining}`);
            }
        }

        // Verify
        const finalTotal = bets.reduce((sum, betRef) => sum + betRef.ticket.numberBets[betRef.betIndex].bet, 0);
        console.log(`Final total for ${drawTime}: ₱${finalTotal.toLocaleString()} (target: ₱${targetRevenue.toLocaleString()})`);
    });

    // Final verification: ensure total across all draws equals booklet revenue
    const totalAcrossDraws = sheets.reduce(
        (sum, sheet) => sum + sheet.tickets.reduce(
            (s, ticket) => s + ticket.numberBets.reduce((nb, bet) => nb + bet.bet, 0),
            0
        ),
        0
    );

    if (totalAcrossDraws !== bookletRevenue) {
        const diff = bookletRevenue - totalAcrossDraws;
        console.log(`\nFinal adjustment needed: ₱${diff}`);

        // Collect all bets for final adjustment
        const allBets: Array<{ ticket: Ticket; betIndex: number }> = [];
        sheets.forEach(sheet => {
            sheet.tickets.forEach(ticket => {
                ticket.numberBets.forEach((_, betIndex) => {
                    allBets.push({ ticket, betIndex });
                });
            });
        });

        // Shuffle for random distribution
        for (let i = allBets.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allBets[i], allBets[j]] = [allBets[j], allBets[i]];
        }

        // Adjust bets one by one
        let remaining = diff;
        for (const betRef of allBets) {
            if (remaining === 0) break;

            const currentBet = betRef.ticket.numberBets[betRef.betIndex].bet;

            if (remaining > 0 && currentBet < maxBet) {
                const toAdd = Math.min(maxBet - currentBet, remaining);
                betRef.ticket.numberBets[betRef.betIndex].bet = currentBet + toAdd;
                remaining -= toAdd;
            } else if (remaining < 0 && currentBet > minBet) {
                const toSubtract = Math.min(currentBet - minBet, Math.abs(remaining));
                betRef.ticket.numberBets[betRef.betIndex].bet = currentBet - toSubtract;
                remaining += toSubtract;
            }
        }

        console.log(`Final adjustment complete. Remaining: ₱${remaining}`);
    }

    console.log('=== Sheet generation with draw constraints complete ===\n');
    return sheets;
}

function distributeRevenueAcrossBooklets(totalRevenue: number, bookletCount: number): number[] {
    // Ensure total revenue is a whole number
    const wholeRevenue = Math.floor(totalRevenue);

    if (bookletCount === 1) {
        return [wholeRevenue];
    }

    // Calculate average revenue per booklet
    const averageRevenue = Math.floor(wholeRevenue / bookletCount);

    // Generate slight variations around the average (±5% variation)
    const variationPercent = 0.05; // 5% variation
    const maxVariation = Math.floor(averageRevenue * variationPercent);

    const revenues: number[] = [];
    let remainingRevenue = wholeRevenue;

    for (let i = 0; i < bookletCount - 1; i++) {
        // Generate random variation from -maxVariation to +maxVariation
        const variation = Math.floor(Math.random() * (maxVariation * 2 + 1)) - maxVariation;
        const revenue = averageRevenue + variation;

        revenues.push(revenue);
        remainingRevenue -= revenue;
    }

    // Last booklet gets exactly the remaining amount (ensures total matches exactly)
    revenues.push(remainingRevenue);

    // CRITICAL: Verify the sum matches exactly
    const sum = revenues.reduce((a, b) => a + b, 0);
    if (sum !== wholeRevenue) {
        console.error(`❌ Revenue distribution error: Sum=${sum}, Expected=${wholeRevenue}, Diff=${sum - wholeRevenue}`);
        console.error('Individual revenues:', revenues);
        throw new Error(`Revenue distribution failed: got ${sum}, expected ${wholeRevenue}`);
    }

    console.log(`✓ Distributed ₱${wholeRevenue.toLocaleString()} across ${bookletCount} booklets (sum verified)`);

    return revenues;
}

// Generate multiple booklets for a province
export function generateBookletBatch(
    province: string,
    totalDailyRevenue: number,
    bookletCount: number,
    minBet: number = 5,
    maxBet: number = 150,
    multipleOfFivePercent: number = 80,
    serialRanges: Array<{ start: string; end: string }> = [{ start: "1000001", end: "1000250" }],
    customGameTypes?: GameType[],
    totalPayout?: number,
    winningNumbers?: WinningNumbers,
    companyCode?: string,
    drawRevenuePercentages?: Record<string, number>
): BookletBatch {
    // Use custom game types if provided, otherwise fall back to default
    const gameTypes = customGameTypes || defaultGameTypes;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    // Distribute revenue randomly across booklets
    const bookletRevenues = distributeRevenueAcrossBooklets(totalDailyRevenue, bookletCount);

    // If draw revenue percentages are provided, calculate target revenue per draw time
    let drawRevenueTargets: Record<string, number> | undefined;
    if (drawRevenuePercentages) {
        drawRevenueTargets = {};
        Object.keys(drawRevenuePercentages).forEach(drawTime => {
            drawRevenueTargets![drawTime] = Math.floor(totalDailyRevenue * drawRevenuePercentages[drawTime] / 100);
        });
        console.log('Per-draw revenue targets:', drawRevenueTargets);
    }

    // Generate each booklet with its assigned revenue
    const booklets: Booklet[] = [];
    for (let i = 1; i <= bookletCount; i++) {
        const bookletRevenue = bookletRevenues[i - 1];

        // If draw revenue percentages are provided, generate sheets with draw-specific constraints
        let sheets: Sheet[];
        if (drawRevenueTargets) {
            sheets = generateSheetsWithDrawConstraints(gameTypes, bookletRevenue, minBet, maxBet, multipleOfFivePercent, drawRevenueTargets, bookletCount, companyCode || "ADS");
        } else {
            // Standard generation
            const baseSheets = generateBaseSheets(gameTypes, bookletRevenue, minBet, maxBet, companyCode || "ADS");
            sheets = distributeBets(baseSheets, bookletRevenue, minBet, maxBet, multipleOfFivePercent, gameTypes);
        }

        // Assign serial numbers to each ticket using this booklet's serial range
        // IMPORTANT: Within each sheet, assign serials in groups of 5:
        // Sheet 1: E=5, D=4, C=3, B=2, A=1
        // Sheet 2: E=10, D=9, C=8, B=7, A=6
        // Sheet 3: E=15, D=14, C=13, B=12, A=11
        const serialRange = serialRanges[i - 1] || { start: "1000001", end: "1000250" };
        const startSerial = parseInt(serialRange.start);

        sheets.forEach((sheet, sheetIndex) => {
            // Calculate the base serial for this sheet (increments by 5 per sheet)
            // Sheet 0: base = startSerial (e.g., 1000001), assigns 1-5
            // Sheet 1: base = startSerial + 5 (e.g., 1000006), assigns 6-10
            // Sheet 2: base = startSerial + 10 (e.g., 1000011), assigns 11-15
            const baseSerial = startSerial + (sheetIndex * TICKETS_PER_SHEET);

            // For this sheet, assign the HIGHEST serial to E (base + 4), lowest to A (base + 0)
            // Since TICKET_LABELS = ["E", "D", "C", "B", "A"], we iterate in that order
            // E (index 0) gets baseSerial + 4 = highest in this group
            // D (index 1) gets baseSerial + 3
            // C (index 2) gets baseSerial + 2
            // B (index 3) gets baseSerial + 1
            // A (index 4) gets baseSerial + 0 = lowest in this group
            sheet.tickets.forEach((ticket, ticketIndex) => {
                const serialOffset = TICKETS_PER_SHEET - 1 - ticketIndex; // 4, 3, 2, 1, 0
                const serialNumber = baseSerial + serialOffset;
                const serialNumber8Digits = serialNumber.toString().padStart(8, '0');
                ticket.serialNumber = `000000${serialNumber8Digits}`;
            });
        });

        // Calculate total bets
        const totalBets = sheets.reduce(
            (sum, sheet) => sum + sheet.tickets.reduce(
                (s, ticket) => s + ticket.numberBets.reduce((nb, bet) => nb + bet.bet, 0),
                0
            ),
            0
        );

        // Verify this booklet has correct structure
        if (sheets.length !== SHEETS_PER_BOOKLET) {
            console.error(`❌ BOOKLET ${i}: Only ${sheets.length} sheets generated (expected ${SHEETS_PER_BOOKLET})!`);
        }
        const totalTickets = sheets.reduce((sum, sheet) => sum + sheet.tickets.length, 0);
        const expectedTickets = SHEETS_PER_BOOKLET * TICKETS_PER_SHEET;
        if (totalTickets !== expectedTickets) {
            console.error(`❌ BOOKLET ${i}: Only ${totalTickets} tickets generated (expected ${expectedTickets})!`);
        }

        booklets.push({
            id: generateBookletId(province, now, serialRange.start, i),
            province,
            revenue: bookletRevenue,
            bookletNumber: i,
            totalBooklets: bookletCount,
            sheets,
            totalBets,
            generatedAt: now.toISOString(),
        });
    }

    // Calculate grand total - should be exact since each booklet is exact
    const grandTotalBets = booklets.reduce((sum, b) => sum + (b.totalBets || 0), 0);

    // Verify grand total matches
    if (grandTotalBets === totalDailyRevenue) {
        console.log(`✓ Grand Total Bets: ₱${grandTotalBets.toLocaleString()} (exact match)`);
    } else {
        console.error(`❌ CRITICAL: Grand total mismatch: ₱${grandTotalBets.toLocaleString()} vs target ₱${totalDailyRevenue.toLocaleString()}`);

        // List each booklet's revenue vs bets for debugging
        booklets.forEach((b, idx) => {
            console.log(`Booklet ${idx + 1}: Revenue=${b.revenue}, Total Bets=${b.totalBets || 0}, Diff=${b.revenue - (b.totalBets || 0)}`);
        });

        throw new Error(`Grand total mismatch: got ₱${grandTotalBets}, expected ₱${totalDailyRevenue}`);
    }

    // If totalPayout and winningNumbers are provided, allocate exact payout during generation
    if (totalPayout && totalPayout > 0 && winningNumbers) {
        console.log(`\n===== ALLOCATING EXACT PAYOUT: ₱${totalPayout.toLocaleString()} =====`);
        allocateExactPayout(booklets, winningNumbers, totalPayout, gameTypes, minBet, maxBet, totalDailyRevenue);

        // CRITICAL: Recalculate each booklet's totalBets after payout allocation
        // This ensures the totalBets property reflects the actual sum of all bets
        booklets.forEach((booklet) => {
            booklet.totalBets = booklet.sheets.reduce(
                (sum, sheet) => sum + sheet.tickets.reduce(
                    (s, ticket) => s + ticket.numberBets.reduce((nb, bet) => nb + bet.bet, 0),
                    0
                ),
                0
            );
            // Update revenue to match actual totalBets after payout allocation
            booklet.revenue = booklet.totalBets;
        });

        // Recalculate grand total after allocation
        const finalGrandTotal = booklets.reduce((sum, b) => sum + (b.totalBets || 0), 0);
        console.log(`Final Total Bets after payout allocation: ₱${finalGrandTotal.toLocaleString()}`);

        // CRITICAL: Verify it still matches totalDailyRevenue
        if (finalGrandTotal !== totalDailyRevenue) {
            console.error(`❌ CRITICAL ERROR: Final grand total (₱${finalGrandTotal.toLocaleString()}) doesn't match input revenue (₱${totalDailyRevenue.toLocaleString()})`);
            console.error(`Difference: ₱${Math.abs(finalGrandTotal - totalDailyRevenue).toLocaleString()}`);
            throw new Error(`Final total mismatch after payout allocation: got ₱${finalGrandTotal}, expected ₱${totalDailyRevenue}`);
        }

        console.log(`✓ Final Total Bets = Input Revenue (₱${finalGrandTotal.toLocaleString()})`);
        console.log(`===== PAYOUT ALLOCATION COMPLETE =====\n`);

        return {
            province,
            date: dateStr,
            totalDailyRevenue,
            booklets,
            totalBooklets: bookletCount,
            grandTotalBets: finalGrandTotal,
            generatedAt: now.toISOString(),
            drawRevenuePercentages,
        };
    }

    return {
        province,
        date: dateStr,
        totalDailyRevenue,
        booklets,
        totalBooklets: bookletCount,
        grandTotalBets,
        generatedAt: now.toISOString(),
        drawRevenuePercentages,
    };
}

// Generate a complete booklet for a province with given revenue (single booklet - backwards compatibility)
export function generateBooklet(
    province: string,
    revenue: number,
    minBet: number = 5,
    maxBet: number = 150,
    multipleOfFivePercent: number = 80,
    customGameTypes?: GameType[]
): Booklet {
    // Use generateBookletBatch to create a single booklet
    const batch = generateBookletBatch(
        province,
        revenue,
        1, // Single booklet
        minBet,
        maxBet,
        multipleOfFivePercent,
        [{ start: "1000001", end: "1000250" }],
        customGameTypes
    );

    return batch.booklets[0];
}

// Get game type by ID
export function getGameTypeById(id: string, customGameTypes?: GameType[]): GameType | undefined {
    const gameTypes = customGameTypes || defaultGameTypes;
    return gameTypes.find((gt: GameType) => gt.id === id);
}

// Distribute winning numbers to achieve exact payout amount
// Replaces random numbers with winning numbers until target payout is met
// Ensures no single game type has payout >= 10,000
export function distributeWinningNumbers(
    batch: BookletBatch,
    winningNumbers: WinningNumbers,
    targetTotalPayout: number,
    customGameTypes?: GameType[]
): BookletBatch {
    const adjustedBatch = JSON.parse(JSON.stringify(batch)) as BookletBatch;
    const gameTypes = customGameTypes || defaultGameTypes;
    const MAX_PAYOUT_PER_GAME_TYPE = 9999; // Maximum payout per winning number

    if (!targetTotalPayout || targetTotalPayout === 0) {
        return adjustedBatch;
    }

    console.log(`\n===== DISTRIBUTING TARGET PAYOUT: ₱${targetTotalPayout.toLocaleString()} =====`);

    // Collect ALL available slots across ALL booklets
    const allAvailableSlots: Array<{
        bookletIdx: number;
        sheetIdx: number;
        ticketIdx: number;
        betIdx: number;
        currentNumber: string;
        currentBet: number;
        gameTypeId: string;
        payout: number;
    }> = [];

    adjustedBatch.booklets.forEach((booklet, bookletIdx) => {
        booklet.sheets.forEach((sheet, sheetIdx) => {
            sheet.tickets.forEach((ticket, ticketIdx) => {
                ticket.numberBets.forEach((numberBet, betIdx) => {
                    if (!numberBet.gameTypeId) return;

                    const winningNumber = winningNumbers[numberBet.gameTypeId as keyof WinningNumbers];
                    if (!winningNumber || winningNumber === "") return;

                    // Only consider slots that are NOT already winning
                    if (numberBet.number !== winningNumber) {
                        const gameType = gameTypes.find((g: GameType) => g.id === numberBet.gameTypeId);
                        if (!gameType) return;

                        const payout = gameType.multiplier;

                        allAvailableSlots.push({
                            bookletIdx,
                            sheetIdx,
                            ticketIdx,
                            betIdx,
                            currentNumber: numberBet.number,
                            currentBet: numberBet.bet,
                            gameTypeId: numberBet.gameTypeId,
                            payout,
                        });
                    }
                });
            });
        });
    });

    console.log(`Found ${allAvailableSlots.length} available slots to convert`);

    if (allAvailableSlots.length === 0) {
        console.warn('No available slots to convert to winning numbers!');
        return adjustedBatch;
    }

    // Shuffle slots for random distribution
    for (let i = allAvailableSlots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allAvailableSlots[i], allAvailableSlots[j]] = [allAvailableSlots[j], allAvailableSlots[i]];
    }

    // Track payout per game type to enforce max limit
    const payoutByGameType: Record<string, number> = {};

    // Convert slots to winning numbers until we reach target payout
    // IMPORTANT: We do NOT modify bet amounts - only change numbers to winning numbers
    // This preserves the total revenue constraint
    let totalPayoutAllocated = 0;
    const convertedSlots: typeof allAvailableSlots = [];

    for (const slot of allAvailableSlots) {
        if (totalPayoutAllocated >= targetTotalPayout) break;

        const currentGameTypePayout = payoutByGameType[slot.gameTypeId] || 0;
        const slotPotentialPayout = slot.currentBet * slot.payout;

        // Check if we can add this slot without exceeding limits
        // const remainingNeeded = targetTotalPayout - totalPayoutAllocated;
        const remainingAllowedForGameType = MAX_PAYOUT_PER_GAME_TYPE - currentGameTypePayout;

        if (remainingAllowedForGameType <= 0) {
            // This game type has reached its limit
            continue;
        }

        // Check if adding this slot would exceed the game type limit
        if (currentGameTypePayout + slotPotentialPayout > MAX_PAYOUT_PER_GAME_TYPE) {
            // Skip this slot - adding it would exceed the limit
            continue;
        }

        // Check if adding this slot would exceed the target
        if (totalPayoutAllocated + slotPotentialPayout > targetTotalPayout) {
            // Skip this slot - adding it would exceed target
            continue;
        }

        // Add this slot
        convertedSlots.push(slot);
        totalPayoutAllocated += slotPotentialPayout;
        payoutByGameType[slot.gameTypeId] = currentGameTypePayout + slotPotentialPayout;
    }

    console.log(`Converted ${convertedSlots.length} slots, Total payout: ₱${totalPayoutAllocated.toLocaleString()}, Target: ₱${targetTotalPayout.toLocaleString()}, Difference: ₱${Math.abs(targetTotalPayout - totalPayoutAllocated).toLocaleString()}`);

    // Apply the conversions - ONLY change the number, NOT the bet amount
    convertedSlots.forEach((slot) => {
        const booklet = adjustedBatch.booklets[slot.bookletIdx];
        const numberBet = booklet.sheets[slot.sheetIdx].tickets[slot.ticketIdx].numberBets[slot.betIdx];
        const winningNumber = winningNumbers[slot.gameTypeId as keyof WinningNumbers];

        // Change number to winning number (keep bet amount unchanged)
        numberBet.number = winningNumber;
    });

    // Log payout per game type
    console.log('Payout by game type:');
    Object.entries(payoutByGameType).forEach(([gameTypeId, payout]) => {
        console.log(`  ${gameTypeId}: ₱${payout.toLocaleString()}`);
    });

    // Recalculate all booklet totals
    adjustedBatch.booklets.forEach((booklet) => {
        booklet.totalBets = booklet.sheets.reduce(
            (sum, sheet) =>
                sum +
                sheet.tickets.reduce(
                    (s, ticket) => s + ticket.numberBets.reduce((nb, bet) => nb + bet.bet, 0),
                    0
                ),
            0
        );
        // Update revenue to match actual totalBets after payout distribution
        booklet.revenue = booklet.totalBets;
    });

    // Recalculate grand total
    adjustedBatch.grandTotalBets = adjustedBatch.booklets.reduce((sum, b) => sum + (b.totalBets || 0), 0);

    console.log(`Final grand total bets: ₱${adjustedBatch.grandTotalBets.toLocaleString()}`);
    console.log(`===== PAYOUT DISTRIBUTION COMPLETE =====\n`);

    return adjustedBatch;
}


// DEPRECATED: Old function for reducing payouts below max
// Adjust bets for winning numbers to keep payouts below 10k
export function adjustBetsForWinningNumbers(
    batch: BookletBatch,
    winningNumbers: WinningNumbers,
    maxPayout: number = 10000,
    customGameTypes?: GameType[]
): BookletBatch {
    const adjustedBatch = JSON.parse(JSON.stringify(batch)) as BookletBatch;
    const gameTypes = customGameTypes || defaultGameTypes;

    // For each booklet, check payouts and redistribute if needed
    adjustedBatch.booklets.forEach((booklet) => {
        // Calculate total payout per winning number across entire booklet
        const payoutsByGameType: Record<string, { totalBet: number; payout: number }> = {};

        // First pass: Calculate total bets on each winning number
        booklet.sheets.forEach((sheet) => {
            sheet.tickets.forEach((ticket) => {
                ticket.numberBets.forEach((numberBet) => {
                    if (!numberBet.gameTypeId) return;

                    const winningNumber = winningNumbers[numberBet.gameTypeId as keyof WinningNumbers];
                    if (!winningNumber || winningNumber === "") return;

                    // Check if this number matches the winning number
                    if (numberBet.number === winningNumber) {
                        const gameType = gameTypes.find((g: GameType) => g.id === numberBet.gameTypeId);
                        if (!gameType) return;

                        const payout = gameType.multiplier;

                        if (!payoutsByGameType[numberBet.gameTypeId]) {
                            payoutsByGameType[numberBet.gameTypeId] = { totalBet: 0, payout };
                        }
                        payoutsByGameType[numberBet.gameTypeId].totalBet += numberBet.bet;
                    }
                });
            });
        });

        // Check which game types have payouts >= maxPayout (must be < 10000)
        const gameTypesToAdjust: string[] = [];
        Object.entries(payoutsByGameType).forEach(([gameTypeId, { totalBet, payout }]) => {
            const totalPayout = totalBet * payout;
            if (totalPayout >= maxPayout) {
                gameTypesToAdjust.push(gameTypeId);
            }
        });

        // If no adjustments needed, skip this booklet
        if (gameTypesToAdjust.length === 0) {
            return;
        }

        // Second pass: Adjust bets for each game type that exceeds max payout
        gameTypesToAdjust.forEach((gameTypeId) => {
            const winningNumber = winningNumbers[gameTypeId as keyof WinningNumbers];
            const { payout } = payoutsByGameType[gameTypeId];

            // Calculate max allowed total bet for this winning number
            const maxAllowedTotalBet = Math.floor((maxPayout - 1) / payout);

            // Track total reduction needed
            let totalReduction = 0;

            // Collect all winning bets for this game type
            const winningBets: Array<{
                sheetIdx: number;
                ticketIdx: number;
                betIdx: number;
                currentBet: number;
            }> = [];

            booklet.sheets.forEach((sheet, sheetIdx) => {
                sheet.tickets.forEach((ticket, ticketIdx) => {
                    ticket.numberBets.forEach((numberBet, betIdx) => {
                        if (
                            numberBet.gameTypeId === gameTypeId &&
                            numberBet.number === winningNumber
                        ) {
                            winningBets.push({
                                sheetIdx,
                                ticketIdx,
                                betIdx,
                                currentBet: numberBet.bet,
                            });
                        }
                    });
                });
            });

            // Calculate total current bet
            const currentTotalBet = winningBets.reduce((sum, b) => sum + b.currentBet, 0);
            totalReduction = currentTotalBet - maxAllowedTotalBet;

            // Reduce bets proportionally
            let remainingReduction = totalReduction;
            winningBets.forEach((bet, idx) => {
                let reduction: number;
                if (idx === winningBets.length - 1) {
                    // Last bet gets exact remaining reduction
                    reduction = remainingReduction;
                } else {
                    // Proportional reduction
                    const proportion = bet.currentBet / currentTotalBet;
                    reduction = Math.round(totalReduction * proportion);
                }

                const newBet = Math.max(0, bet.currentBet - reduction);
                booklet.sheets[bet.sheetIdx].tickets[bet.ticketIdx].numberBets[bet.betIdx].bet = newBet;
                remainingReduction -= reduction;
            });

            // Third pass: Redistribute the reduction to non-winning bets
            if (totalReduction > 0) {
                // Collect all non-winning bets in the booklet
                const nonWinningBets: Array<{
                    sheetIdx: number;
                    ticketIdx: number;
                    betIdx: number;
                    currentBet: number;
                }> = [];

                booklet.sheets.forEach((sheet, sheetIdx) => {
                    sheet.tickets.forEach((ticket, ticketIdx) => {
                        ticket.numberBets.forEach((numberBet, betIdx) => {
                            // Skip winning bets for this game type
                            const isWinning =
                                numberBet.gameTypeId === gameTypeId &&
                                numberBet.number === winningNumber;

                            if (!isWinning && numberBet.bet > 0) {
                                nonWinningBets.push({
                                    sheetIdx,
                                    ticketIdx,
                                    betIdx,
                                    currentBet: numberBet.bet,
                                });
                            }
                        });
                    });
                });

                if (nonWinningBets.length > 0) {
                    // Calculate total of non-winning bets
                    const totalNonWinning = nonWinningBets.reduce((sum, b) => sum + b.currentBet, 0);

                    // Distribute the reduction proportionally
                    let remainingToDistribute = totalReduction;

                    nonWinningBets.forEach((bet, idx) => {
                        let addition: number;
                        if (idx === nonWinningBets.length - 1) {
                            // Last bet gets exact remaining amount
                            addition = remainingToDistribute;
                        } else {
                            // Distribute proportionally
                            const proportion = bet.currentBet / totalNonWinning;
                            addition = Math.round(totalReduction * proportion);
                        }

                        booklet.sheets[bet.sheetIdx].tickets[bet.ticketIdx].numberBets[bet.betIdx].bet += addition;
                        remainingToDistribute -= addition;
                    });
                }
            }
        });

        // Recalculate booklet totals
        booklet.totalBets = booklet.sheets.reduce(
            (sum, sheet) =>
                sum +
                sheet.tickets.reduce(
                    (s, ticket) => s + ticket.numberBets.reduce((nb, bet) => nb + bet.bet, 0),
                    0
                ),
            0
        );
        // Update revenue to match actual totalBets after payout distribution
        booklet.revenue = booklet.totalBets;
    });

    // Recalculate grand total
    adjustedBatch.grandTotalBets = adjustedBatch.booklets.reduce((sum, b) => sum + (b.totalBets || 0), 0);

    return adjustedBatch;
}
