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

// const NUMBERS_PER_TICKET = 3; // 3 numbers per ticket
const TICKETS_PER_SHEET = 5; // A, B, C, D, E
// const NUMBERS_PER_SHEET = NUMBERS_PER_TICKET * TICKETS_PER_SHEET; // 15 total numbers per sheet
const SHEETS_PER_BOOKLET = 50; // 50 sheets per booklet
// const TOTAL_SLOTS = SHEETS_PER_BOOKLET * NUMBERS_PER_SHEET; // 750 slots per booklet
const TICKET_LABELS = ["E", "D", "C", "B", "A"];

// Generate sheet ID in format: 11-COMPANYCODE-001
function generateSheetId(index: number, companyCode: string = "STL"): string {
    const sheetNum = (index + 1).toString().padStart(3, "0");
    return `11-${companyCode}-${sheetNum}`;
}

// Generate a random number with specified digits
// 2-digit games: XX format (e.g., 32, 96, 05) - Last 2 digits
// 3-digit games: 000-999 (each digit can be 0-9, zeros allowed in start/middle/finish)
function generateRandomNumber(digits: number, _gameType?: GameType): string {
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
function generateBaseSheets(gameTypes: GameType[], targetRevenue: number, _minBet: number, _maxBet: number, companyCode: string = "STL"): Sheet[] {
    const sheets: Sheet[] = [];
    const totalSheets = SHEETS_PER_BOOKLET;
    let totalSlotsGenerated = 0;
    let nationalBetsCount = 0;
    let localBetsCount = 0;

    for (let sheetIndex = 0; sheetIndex < totalSheets; sheetIndex++) {
        const tickets: Ticket[] = [];

        for (const label of TICKET_LABELS) {
            const numberBets: NumberBet[] = [];
            let numbersCount: number;
            const rand = Math.random();
            if (rand < 0.45) {
                numbersCount = 3;
            } else if (rand < 0.80) {
                numbersCount = 2;
            } else {
                numbersCount = 1;
            }

            const nationalGames = gameTypes.filter(gt => gt.isNational === true);
            const localGames = gameTypes.filter(gt => gt.isNational === false);

            let ticketGameType: GameType;
            const gameTypeRand = Math.random();

            if (nationalGames.length > 0 && localGames.length > 0) {
                if (gameTypeRand < 0.90) {
                    ticketGameType = nationalGames[Math.floor(Math.random() * nationalGames.length)];
                } else {
                    ticketGameType = localGames[Math.floor(Math.random() * localGames.length)];
                }
            } else {
                ticketGameType = gameTypes[Math.floor(Math.random() * gameTypes.length)];
            }

            for (let k = 0; k < numbersCount; k++) {
                const number = generateRandomNumber(ticketGameType.digits, ticketGameType);
                numberBets.push({
                    number,
                    bet: 0,
                    label,
                    gameTypeId: ticketGameType.id,
                    gameTypeName: ticketGameType.name,
                    gameTypeTime: ticketGameType.time,
                });

                if (ticketGameType.isNational) {
                    nationalBetsCount++;
                } else {
                    localBetsCount++;
                }
                totalSlotsGenerated++;
            }

            tickets.push({ label, numberBets });
        }

        sheets.push({ id: generateSheetId(sheetIndex, companyCode), tickets });
    }

    const nationalPercent = totalSlotsGenerated > 0 ? (nationalBetsCount / totalSlotsGenerated * 100).toFixed(1) : '0.0';
    const localPercent = totalSlotsGenerated > 0 ? (localBetsCount / totalSlotsGenerated * 100).toFixed(1) : '0.0';
    console.log(`Generated ${sheets.length} sheets (expected ${SHEETS_PER_BOOKLET})`);
    console.log(`Generated ${totalSlotsGenerated} slots for target revenue ₱${targetRevenue.toLocaleString()}`);
    console.log(`Distribution - National: ${nationalBetsCount} (${nationalPercent}%), Local: ${localBetsCount} (${localPercent}%)`);

    const sheetsWithIssues = sheets.filter(s => s.tickets.length !== 5);
    if (sheetsWithIssues.length > 0) {
        console.error(`⚠️ WARNING: ${sheetsWithIssues.length} sheets have incorrect ticket count!`);
    }

    return sheets;
}

// Distribute bets to match target revenue exactly
function distributeBets(sheets: Sheet[], targetRevenue: number, minBet: number, maxBet: number, multipleOfFivePercent: number = 80, gameTypes: GameType[] = []): Sheet[] {
    const updatedSheets = JSON.parse(JSON.stringify(sheets)) as Sheet[];

    const allSlots: { sheetIdx: number; ticketIdx: number; numIdx: number; gameTypeId?: string; multiplier: number }[] = [];
    updatedSheets.forEach((sheet, sheetIdx) => {
        sheet.tickets.forEach((ticket, ticketIdx) => {
            ticket.numberBets.forEach((numberBet, numIdx) => {
                const gameType = gameTypes.find(gt => gt.id === numberBet.gameTypeId);
                const multiplier = gameType?.multiplier || 500;
                allSlots.push({ sheetIdx, ticketIdx, numIdx, gameTypeId: numberBet.gameTypeId, multiplier });
            });
        });
    });

    const totalSlots = allSlots.length;

    const absoluteMinRevenue = totalSlots * minBet;
    const absoluteMaxRevenue = totalSlots * maxBet;

    if (targetRevenue < absoluteMinRevenue) {
        throw new Error(`Mathematically impossible: Target revenue for this booklet (₱${targetRevenue.toLocaleString()}) is lower than the absolute minimum possible (₱${absoluteMinRevenue.toLocaleString()}) with ${totalSlots} generated slots and a minimum bet of ₱${minBet}. Try lowering the minimum bet or increasing daily revenue.`);
    }

    if (targetRevenue > absoluteMaxRevenue) {
        throw new Error(`Mathematically impossible: Target revenue for this booklet (₱${targetRevenue.toLocaleString()}) is higher than the absolute maximum possible (₱${absoluteMaxRevenue.toLocaleString()}) with ${totalSlots} generated slots and a maximum bet of ₱${maxBet}. Try increasing the maximum bet or decreasing daily revenue.`);
    }

    for (let i = allSlots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allSlots[i], allSlots[j]] = [allSlots[j], allSlots[i]];
    }

    const slotTypes: ("multiple5" | "specific")[] = [];
    for (let i = 0; i < totalSlots; i++) {
        slotTypes.push(Math.random() * 100 < multipleOfFivePercent ? "multiple5" : "specific");
    }

    const generatedBets: number[] = [];
    for (let i = 0; i < totalSlots; i++) {
        generatedBets.push(slotTypes[i] === "multiple5"
            ? generateMultipleOf5Bet(minBet, maxBet)
            : generateSpecificBet(minBet, maxBet));
    }

    const initialTotal = generatedBets.reduce((sum, bet) => sum + bet, 0);
    const scalingFactor = targetRevenue / initialTotal;

    // Scale bets to match target closely while preserving distribution
    for (let i = 0; i < totalSlots; i++) {
        let scaledBet = generatedBets[i] * scalingFactor;
        
        // Ensure within min/max bounds
        scaledBet = Math.max(minBet, Math.min(maxBet, scaledBet));
        
        // Preserve multiple of 5 if requested
        if (slotTypes[i] === "multiple5" && scaledBet >= 10) {
            scaledBet = Math.round(scaledBet / 5) * 5;
        } else {
            scaledBet = Math.round(scaledBet);
        }
        
        generatedBets[i] = scaledBet;
    }

    const generatedTotal = generatedBets.reduce((sum, bet) => sum + bet, 0);
    const adjustment = targetRevenue - generatedTotal;
    console.log(`Initial: ₱${initialTotal.toLocaleString()} -> Scaled bets total: ₱${generatedTotal.toLocaleString()}, Target: ₱${targetRevenue.toLocaleString()}, Adjustment needed: ₱${adjustment.toLocaleString()}`);

    const assignedBets: number[] = [...generatedBets];
    let remainingAdjustment = adjustment;
    const MAX_ADJUSTMENT_PER_SLOT = 10;

    const adjustableIndices = [...Array(totalSlots).keys()];
    for (let i = adjustableIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [adjustableIndices[i], adjustableIndices[j]] = [adjustableIndices[j], adjustableIndices[i]];
    }

    for (const i of adjustableIndices) {
        if (Math.abs(remainingAdjustment) === 0) break;
        const currentBet = assignedBets[i];
        const cappedAdjustment = Math.max(-MAX_ADJUSTMENT_PER_SLOT, Math.min(MAX_ADJUSTMENT_PER_SLOT, remainingAdjustment));
        let adjustedBet = Math.round(Math.max(minBet, Math.min(maxBet, currentBet + cappedAdjustment)));
        if (slotTypes[i] === "multiple5" && adjustedBet >= 10) {
            adjustedBet = Math.round(adjustedBet / 5) * 5;
        }
        remainingAdjustment -= adjustedBet - currentBet;
        assignedBets[i] = adjustedBet;
    }

    // Final pass: fix any remaining penny differences
    if (remainingAdjustment !== 0) {
        let safetyCounter = 0;
        while (remainingAdjustment !== 0 && safetyCounter < 100) {
            safetyCounter++;
            const shuffled = [...Array(totalSlots).keys()];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            for (const i of shuffled) {
                if (remainingAdjustment === 0) break;
                if (remainingAdjustment > 0 && assignedBets[i] < maxBet) {
                    assignedBets[i]++;
                    remainingAdjustment--;
                } else if (remainingAdjustment < 0 && assignedBets[i] > minBet) {
                    assignedBets[i]--;
                    remainingAdjustment++;
                }
            }
        }
    }

    for (let i = 0; i < totalSlots; i++) {
        const { sheetIdx, ticketIdx, numIdx } = allSlots[i];
        updatedSheets[sheetIdx].tickets[ticketIdx].numberBets[numIdx].bet = Math.floor(assignedBets[i]);
    }

    // Verify exact match
    let actualTotal = updatedSheets.reduce((sum, sheet) =>
        sum + sheet.tickets.reduce((s, ticket) =>
            s + ticket.numberBets.reduce((nb, bet) => nb + bet.bet, 0), 0), 0);
    if (actualTotal === targetRevenue) {
        console.log(`✓ Exact revenue match: ₱${actualTotal.toLocaleString()}`);
    } else {
        throw new Error(`Failed to generate exact revenue. Got ₱${actualTotal}, expected ₱${targetRevenue}`);
    }

    return updatedSheets;
}

// Generate booklet ID in format: MIS-20251231-1000001
function generateBookletId(province: string, date: Date, startSerialNumber: string, _bookletNumber: number): string {
    const provinceCode = province.substring(0, 3).toUpperCase();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    return `${provinceCode}-${dateStr}-${startSerialNumber}`;
}

// Allocate exact payout by setting winning numbers during generation
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
    const prizeFund = totalRevenue ? Math.floor(totalRevenue * 0.339) : 0;
    const MAX_SINGLE_PAYOUT = 10000;

    // Step 0: Clear accidental matches
    booklets.forEach((booklet) => {
        booklet.sheets.forEach((sheet) => {
            sheet.tickets.forEach((ticket) => {
                ticket.numberBets.forEach((numberBet) => {
                    if (!numberBet.gameTypeId) return;
                    const winningNumber = winningNumbers[numberBet.gameTypeId];
                    if (!winningNumber) return;
                    const gameType = gameTypes.find((g: GameType) => g.id === numberBet.gameTypeId);
                    if (!gameType) return;
                    if (numberBet.number === winningNumber) {
                        let newNumber: string;
                        do { newNumber = generateRandomNumber(gameType.digits, gameType); }
                        while (newNumber === winningNumber);
                        numberBet.number = newNumber;
                    }
                });
            });
        });
    });

    // Step 1: Collect all available slots
    const allSlots: Array<{
        bookletIdx: number; sheetIdx: number; ticketIdx: number; betIdx: number;
        gameTypeId: string; currentNumber: string; currentBet: number; payout: number;
    }> = [];

    booklets.forEach((booklet, bookletIdx) => {
        booklet.sheets.forEach((sheet, sheetIdx) => {
            sheet.tickets.forEach((ticket, ticketIdx) => {
                ticket.numberBets.forEach((numberBet, betIdx) => {
                    if (!numberBet.gameTypeId) return;
                    const winningNumber = winningNumbers[numberBet.gameTypeId];
                    if (!winningNumber || winningNumber === "") return;
                    const gameType = gameTypes.find((g: GameType) => g.id === numberBet.gameTypeId);
                    if (!gameType) return;
                    allSlots.push({
                        bookletIdx, sheetIdx, ticketIdx, betIdx,
                        gameTypeId: numberBet.gameTypeId,
                        currentNumber: numberBet.number,
                        currentBet: numberBet.bet,
                        payout: gameType.multiplier,
                    });
                });
            });
        });
    });

    console.log(`Found ${allSlots.length} total slots available for payout allocation`);

    // Step 2: Group and shuffle slots
    const slotsByGameType = new Map<string, typeof allSlots>();
    allSlots.forEach(slot => {
        if (!slotsByGameType.has(slot.gameTypeId)) slotsByGameType.set(slot.gameTypeId, []);
        slotsByGameType.get(slot.gameTypeId)!.push(slot);
    });

    // Shuffle within each group
    slotsByGameType.forEach(slots => {
        for (let i = slots.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [slots[i], slots[j]] = [slots[j], slots[i]];
        }
    });

    // Step 3: Select slots for payout
    let totalPayoutAllocated = 0;
    const selectedSlots: Array<{ slot: typeof allSlots[0] }> = [];
    const ticketGameTypeUsage = new Set<string>();

    for (const [, slots] of slotsByGameType) {
        let selectedFromGameType = 0;
        const minPerGameType = Math.min(3, slots.length);

        for (const slot of slots) {
            if (selectedFromGameType >= minPerGameType) break;
            const ticketKey = `${slot.bookletIdx}-${slot.sheetIdx}-${slot.ticketIdx}-${slot.gameTypeId}`;
            if (ticketGameTypeUsage.has(ticketKey)) continue;

            const maxAllowedBet = Math.floor((MAX_SINGLE_PAYOUT - 1) / slot.payout);
            if (slot.currentBet > maxAllowedBet) {
                if (maxAllowedBet >= minBet) {
                    slot.currentBet = minBet + Math.floor(Math.random() * (maxAllowedBet - minBet + 1));
                } else continue;
            }

            const slotPayout = slot.currentBet * slot.payout;
            if (totalPayoutAllocated + slotPayout <= targetPayout) {
                selectedSlots.push({ slot });
                ticketGameTypeUsage.add(ticketKey);
                totalPayoutAllocated += slotPayout;
                selectedFromGameType++;
            }
        }
    }

    // Fill remaining payout
    for (const slot of allSlots) {
        const remaining = targetPayout - totalPayoutAllocated;
        if (remaining <= 0) break;
        if (selectedSlots.some(s => s.slot === slot)) continue;
        const ticketKey = `${slot.bookletIdx}-${slot.sheetIdx}-${slot.ticketIdx}-${slot.gameTypeId}`;
        if (ticketGameTypeUsage.has(ticketKey)) continue;

        const maxAllowedBet = Math.floor((MAX_SINGLE_PAYOUT - 1) / slot.payout);
        if (slot.currentBet > maxAllowedBet) {
            if (maxAllowedBet >= minBet) {
                slot.currentBet = minBet + Math.floor(Math.random() * (maxAllowedBet - minBet + 1));
            } else continue;
        }

        const slotPayout = slot.currentBet * slot.payout;
        if (totalPayoutAllocated + slotPayout <= targetPayout) {
            selectedSlots.push({ slot });
            ticketGameTypeUsage.add(ticketKey);
            totalPayoutAllocated += slotPayout;
        }
    }

    // Fine-tune bet amounts to reach exact target
    if (totalPayoutAllocated !== targetPayout && selectedSlots.length > 0) {
        let remaining = targetPayout - totalPayoutAllocated;
        for (const { slot } of selectedSlots) {
            if (remaining === 0) break;
            const mult = slot.payout;
            const maxAllowedBet = Math.floor((MAX_SINGLE_PAYOUT - 1) / mult);
            const adj = Math.round(remaining / mult);
            if (adj === 0) continue;
            const newBet = slot.currentBet + adj;
            if (newBet >= minBet && newBet <= maxBet && newBet <= maxAllowedBet) {
                remaining -= adj * mult;
                slot.currentBet = newBet;
                totalPayoutAllocated += adj * mult;
            }
        }
    }

    // Step 4: Apply winning numbers and adjusted bets
    let numbersChanged = 0;
    let totalRevenueReduction = 0;
    selectedSlots.forEach(({ slot }) => {
        const numberBet = booklets[slot.bookletIdx].sheets[slot.sheetIdx].tickets[slot.ticketIdx].numberBets[slot.betIdx];
        if (slot.currentBet < numberBet.bet) totalRevenueReduction += numberBet.bet - slot.currentBet;
        numberBet.number = winningNumbers[slot.gameTypeId];
        numberBet.bet = slot.currentBet;
        (numberBet as any).payoutAmount = slot.currentBet * slot.payout;
        (numberBet as any).isWinner = true;
        numbersChanged++;
    });

    console.log(`✓ Changed ${numbersChanged} numbers to match winning numbers`);

    // Step 5: Verify actual payout achieved
    const actualPayout = selectedSlots.reduce(({ sum }, { slot }) => {
        const bet = booklets[slot.bookletIdx].sheets[slot.sheetIdx].tickets[slot.ticketIdx].numberBets[slot.betIdx].bet;
        const gameType = gameTypes.find((g: GameType) => g.id === slot.gameTypeId);
        return { sum: sum + bet * (gameType?.multiplier || 0) };
    }, { sum: 0 }).sum;

    console.log(`\n===== PAYOUT VERIFICATION =====`);
    console.log(`Target payout: ₱${targetPayout.toLocaleString()}`);
    console.log(`Actual payout: ₱${actualPayout.toLocaleString()}`);
    console.log(`Difference: ₱${Math.abs(targetPayout - actualPayout).toLocaleString()}`);

    if (actualPayout === targetPayout) {
        console.log(`✓ Exact payout achieved!`);
    } else {
        console.warn(`⚠ Payout not exact (off by ₱${Math.abs(targetPayout - actualPayout).toLocaleString()})`);
    }

    // Step 6: Compensate for revenue reduction by adjusting non-winning bets
    if (totalRevenueReduction > 0 && totalRevenue) {
        const nonWinningBets: Array<{ numberBet: NumberBet }> = [];
        booklets.forEach((booklet) => {
            booklet.sheets.forEach((sheet) => {
                sheet.tickets.forEach((ticket) => {
                    ticket.numberBets.forEach((numberBet) => {
                        const isWinning = selectedSlots.some(
                            ({ slot }) => booklets[slot.bookletIdx].sheets[slot.sheetIdx]
                                .tickets[slot.ticketIdx].numberBets[slot.betIdx] === numberBet
                        );
                        if (!isWinning && numberBet.bet < maxBet) {
                            nonWinningBets.push({ numberBet });
                        }
                    });
                });
            });
        });

        let remainingCompensation = Math.round(totalRevenueReduction);
        for (const { numberBet } of nonWinningBets) {
            if (remainingCompensation <= 0) break;
            const increase = Math.min(maxBet - numberBet.bet, remainingCompensation);
            if (increase > 0) { numberBet.bet += increase; remainingCompensation -= increase; }
        }
    }

    // Step 7: Revenue verification
    const expectedRevenue = booklets.reduce((sum, b) => sum + b.revenue, 0);
    const currentRevenue = booklets.reduce((sum, booklet) =>
        sum + booklet.sheets.reduce((s, sheet) =>
            s + sheet.tickets.reduce((t, ticket) =>
                t + ticket.numberBets.reduce((nb, bet) => nb + bet.bet, 0), 0), 0), 0);
    const revenueAdjustmentNeeded = expectedRevenue - currentRevenue;
    if (revenueAdjustmentNeeded !== 0) {
        const nonWinningBets: Array<{ bookletIdx: number; sheetIdx: number; ticketIdx: number; betIdx: number; currentBet: number }> = [];
        booklets.forEach((booklet, bookletIdx) => {
            booklet.sheets.forEach((sheet, sheetIdx) => {
                sheet.tickets.forEach((ticket, ticketIdx) => {
                    ticket.numberBets.forEach((numberBet, betIdx) => {
                        const isWinning = selectedSlots.some(({ slot }) =>
                            slot.bookletIdx === bookletIdx && slot.sheetIdx === sheetIdx &&
                            slot.ticketIdx === ticketIdx && slot.betIdx === betIdx
                        );
                        if (!isWinning) nonWinningBets.push({ bookletIdx, sheetIdx, ticketIdx, betIdx, currentBet: numberBet.bet });
                    });
                });
            });
        });

        let remainingCompensation = revenueAdjustmentNeeded;
        for (const betInfo of nonWinningBets) {
            if (remainingCompensation === 0) break;
            const currentBet = betInfo.currentBet;
            const newBet = Math.max(minBet, Math.min(maxBet, currentBet + Math.max(-10, Math.min(10, remainingCompensation))));
            const actualAdj = newBet - currentBet;
            if (actualAdj !== 0) {
                booklets[betInfo.bookletIdx].sheets[betInfo.sheetIdx].tickets[betInfo.ticketIdx].numberBets[betInfo.betIdx].bet = newBet;
                remainingCompensation -= actualAdj;
            }
        }
    }

    // Prize fund enforcement
    if (prizeFund > 0) {
        const finalTotalPayout = selectedSlots.reduce((sum, { slot }) => {
            const bet = booklets[slot.bookletIdx].sheets[slot.sheetIdx].tickets[slot.ticketIdx].numberBets[slot.betIdx].bet;
            return sum + bet * slot.payout;
        }, 0);
        if (finalTotalPayout < prizeFund) {
            console.warn(`⚠ WARNING: Payout (₱${finalTotalPayout.toLocaleString()}) < Prize Fund (₱${prizeFund.toLocaleString()})`);
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
    companyCode: string = "STL"
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
    drawRevenuePercentages?: Record<string, number>,
    targetDate?: string
): BookletBatch {
    // Use custom game types if provided, otherwise fall back to default
    const gameTypes = customGameTypes || defaultGameTypes;
    const now = targetDate ? new Date(targetDate) : new Date();
    const dateStr = targetDate || now.toISOString().split('T')[0];

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
            sheets = generateSheetsWithDrawConstraints(gameTypes, bookletRevenue, minBet, maxBet, multipleOfFivePercent, drawRevenueTargets, bookletCount, companyCode || "STL");
        } else {
            // Standard generation
            const baseSheets = generateBaseSheets(gameTypes, bookletRevenue, minBet, maxBet, companyCode || "STL");
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
            let bookletPayout = 0;
            booklet.totalBets = booklet.sheets.reduce(
                (sum, sheet) => sum + sheet.tickets.reduce(
                    (s, ticket) => s + ticket.numberBets.reduce((nb, bet) => {
                        bookletPayout += (bet as any).payoutAmount || 0;
                        return nb + bet.bet;
                    }, 0),
                    0
                ),
                0
            );
            // Update revenue to match actual totalBets after payout allocation
            booklet.revenue = booklet.totalBets;
            booklet.payout = bookletPayout;
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
            totalPayout,
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
