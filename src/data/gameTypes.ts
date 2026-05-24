import type { GameType } from "@/types/lottery";

export const gameTypes: GameType[] = [
    {
        id: "2d-national",
        name: "2D National",
        digits: 2,
        multiplier: 70,
        isNational: true,
        gameFormat: 'standard'
    },
    {
        id: "3d-national",
        name: "3D National",
        digits: 3,
        multiplier: 500,
        isNational: true,
        gameFormat: 'standard'
    },
    {
        id: "pares-p2",
        name: "Pares P2",
        digits: 2,
        multiplier: 500,
        isNational: false,
        gameFormat: 'pares_p2',
        numberRangeMin: 1,
        numberRangeMax: 40
    },
    {
        id: "pares-p3",
        name: "Pares P3",
        digits: 3,
        multiplier: 1000,
        isNational: false,
        gameFormat: 'pares_p3',
        numberRangeMin: 1,
        numberRangeMax: 40
    }
];
