import type { GameType } from "@/types/lottery";

export const gameTypes: GameType[] = [
    {
        id: "l3d-local-1030",
        name: "Local 3D 10:30 AM",
        digits: 3,
        multiplier: 550,
        isNational: false,
        gameFormat: 'L3D',
        time: "10:30 AM"
    },
    {
        id: "3d-national-1400",
        name: "3D 2:00 PM",
        digits: 3,
        multiplier: 500,
        isNational: true,
        gameFormat: '3D',
        time: "2:00 PM"
    },
    {
        id: "l3d-local-1500",
        name: "Local 3D 3:00 PM",
        digits: 3,
        multiplier: 550,
        isNational: false,
        gameFormat: 'L3D',
        time: "3:00 PM"
    },
    {
        id: "3d-national-1700",
        name: "3D 5:00 PM",
        digits: 3,
        multiplier: 500,
        isNational: true,
        gameFormat: '3D',
        time: "5:00 PM"
    },
    {
        id: "l3d-local-1900",
        name: "Local 3D 7:00 PM",
        digits: 3,
        multiplier: 550,
        isNational: false,
        gameFormat: 'L3D',
        time: "7:00 PM"
    },
    {
        id: "3d-national-2100",
        name: "3D 9:00 PM",
        digits: 3,
        multiplier: 500,
        isNational: true,
        gameFormat: '3D',
        time: "9:00 PM"
    }
];
