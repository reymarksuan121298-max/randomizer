/**
 * Pares Win Detection Utilities
 *
 * P2 (Pick 2) Win Types:
 * - Target (Exact Order): 700x - e.g., draw 01-02, bet 01-02
 * - Ekis (Reversed): 50x - e.g., draw 01-02, bet 02-01
 *
 * P3 (Pick 3) Win Types:
 * - Target (Exact Order): 12000x - e.g., draw 01-02-03, bet 01-02-03
 * - Rumble (Any Order): 1999x - e.g., draw 01-02-03, bet 02-03-01
 * - Note: If target wins, they also get rumble (13999x total)
 */

import type { GameType } from "@/types/lottery";

export interface ParesWin {
    isTarget: boolean;
    isEkis: boolean;
    isRumble: boolean;
    targetPayout: number;
    ekisPayout: number;
    rumblePayout: number;
    totalPayout: number;
}

/**
 * Check if bet is the reverse of the winning number (P2 Ekis)
 */
function isEkisWin(winningNumber: string, betNumber: string): boolean {
    const winParts = winningNumber.split('-');
    const betParts = betNumber.split('-');

    if (winParts.length !== 2 || betParts.length !== 2) {
        return false;
    }

    // Check if reversed: 01-02 vs 02-01
    return winParts[0] === betParts[1] && winParts[1] === betParts[0];
}

/**
 * Check if bet contains same numbers in any order (P3 Rumble)
 */
function isRumbleWin(winningNumber: string, betNumber: string): boolean {
    const winParts = winningNumber.split('-').sort();
    const betParts = betNumber.split('-').sort();

    if (winParts.length !== 3 || betParts.length !== 3) {
        return false;
    }

    // Check if same numbers in any order
    return winParts.every((num, idx) => num === betParts[idx]);
}

/**
 * Detect all Pares win types for a bet
 */
export function detectParesWins(
    betNumber: string,
    winningNumber: string,
    gameType: GameType,
    betAmount: number
): ParesWin {
    const result: ParesWin = {
        isTarget: false,
        isEkis: false,
        isRumble: false,
        targetPayout: 0,
        ekisPayout: 0,
        rumblePayout: 0,
        totalPayout: 0,
    };

    // Check for exact match (Target win)
    const isTargetMatch = betNumber === winningNumber;

    if (gameType.gameFormat === 'pares_p2') {
        // P2: Check Target and Ekis
        if (isTargetMatch) {
            result.isTarget = true;
            result.targetPayout = betAmount * (gameType.multiplier || 0);
        } else if (gameType.ekisMultiplier && isEkisWin(winningNumber, betNumber)) {
            result.isEkis = true;
            result.ekisPayout = betAmount * gameType.ekisMultiplier;
        }
    } else if (gameType.gameFormat === 'pares_p3') {
        // P3: Check Target and Rumble
        if (isTargetMatch) {
            // Target win ALSO gets Rumble
            result.isTarget = true;
            result.targetPayout = betAmount * (gameType.multiplier || 0);

            if (gameType.rumbleMultiplier) {
                result.isRumble = true;
                result.rumblePayout = betAmount * gameType.rumbleMultiplier;
            }
        } else if (gameType.rumbleMultiplier && isRumbleWin(winningNumber, betNumber)) {
            // Rumble win only (not target)
            result.isRumble = true;
            result.rumblePayout = betAmount * gameType.rumbleMultiplier;
        }
    }

    result.totalPayout = result.targetPayout + result.ekisPayout + result.rumblePayout;

    return result;
}

/**
 * Check if a bet is a winner (any win type)
 */
export function isParesWinner(
    betNumber: string,
    winningNumber: string,
    gameType: GameType
): boolean {
    const wins = detectParesWins(betNumber, winningNumber, gameType, 1);
    return wins.isTarget || wins.isEkis || wins.isRumble;
}
