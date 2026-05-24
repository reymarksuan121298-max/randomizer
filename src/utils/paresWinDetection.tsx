/**
 * Pares Win Detection Utilities
 * NOTE: Pares P2 and P3 game formats have been removed from this project.
 * This file is kept for interface compatibility only.
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

/** @deprecated Pares formats removed. Always returns no-win result. */
export function detectParesWins(
    _betNumber: string,
    _winningNumber: string,
    _gameType: GameType,
    _betAmount: number
): ParesWin {
    return {
        isTarget: false,
        isEkis: false,
        isRumble: false,
        targetPayout: 0,
        ekisPayout: 0,
        rumblePayout: 0,
        totalPayout: 0,
    };
}

/** @deprecated Pares formats removed. Always returns false. */
export function isParesWinner(
    _betNumber: string,
    _winningNumber: string,
    _gameType: GameType
): boolean {
    return false;
}
