import type { GameType } from "@/types/lottery";

export const defaultGameTypes: GameType[] = [
    { id: "l3d-local-1030", name: "Local 3D 10:30 AM", digits: 3, multiplier: 550, isNational: false, gameFormat: 'L3D', time: "10:30 AM" },
    { id: "l3d-local-l2-1030", name: "Swer3L2 10:30 AM", digits: 2, multiplier: 70, isNational: false, gameFormat: 'standard', time: "10:30 AM" },
    { id: "3d-national-1400", name: "3D 2:00 PM", digits: 3, multiplier: 500, isNational: true, gameFormat: '3D', time: "2:00 PM" },
    { id: "3d-national-l2-1400", name: "3DL2 2:00 PM", digits: 2, multiplier: 70, isNational: true, gameFormat: 'standard', time: "2:00 PM" },

    { id: "l3d-local-1500", name: "Local 3D 3:00 PM", digits: 3, multiplier: 550, isNational: false, gameFormat: 'L3D', time: "3:00 PM" },
    { id: "l3d-local-l2-1500", name: "Swer3L2 3:00 PM", digits: 2, multiplier: 70, isNational: false, gameFormat: 'standard', time: "3:00 PM" },
    { id: "3d-national-1700", name: "3D 5:00 PM", digits: 3, multiplier: 500, isNational: true, gameFormat: '3D', time: "5:00 PM" },
    { id: "3d-national-l2-1700", name: "3DL2 5:00 PM", digits: 2, multiplier: 70, isNational: true, gameFormat: 'standard', time: "5:00 PM" },

    { id: "l3d-local-1900", name: "Local 3D 7:00 PM", digits: 3, multiplier: 550, isNational: false, gameFormat: 'L3D', time: "7:00 PM" },
    { id: "l3d-local-l2-1900", name: "Swer3L2 7:00 PM", digits: 2, multiplier: 70, isNational: false, gameFormat: 'standard', time: "7:00 PM" },
    { id: "3d-national-2100", name: "3D 9:00 PM", digits: 3, multiplier: 500, isNational: true, gameFormat: '3D', time: "9:00 PM" },
    { id: "3d-national-l2-2100", name: "3DL2 9:00 PM", digits: 2, multiplier: 70, isNational: true, gameFormat: 'standard', time: "9:00 PM" }
];

export const cotabatoGameTypes: GameType[] = [
    { id: "cot-l3d-1030", name: "Local 3D 10:30 AM", digits: 3, multiplier: 550, isNational: false, gameFormat: 'L3D', time: "10:30 AM" },
    { id: "cot-l2d-1030", name: "Local 2D 10:30 AM", digits: 2, multiplier: 70, isNational: false, gameFormat: 'standard', time: "10:30 AM" },

    { id: "cot-3d-1400", name: "3D 2:00 PM", digits: 3, multiplier: 500, isNational: true, gameFormat: '3D', time: "2:00 PM" },
    { id: "cot-2d-1400", name: "2D 2:00 PM", digits: 2, multiplier: 70, isNational: true, gameFormat: 'standard', time: "2:00 PM" },

    { id: "cot-l3d-1500", name: "Local 3D 3:00 PM", digits: 3, multiplier: 550, isNational: false, gameFormat: 'L3D', time: "3:00 PM" },
    { id: "cot-l2d-1500", name: "Local 2D 3:00 PM", digits: 2, multiplier: 70, isNational: false, gameFormat: 'standard', time: "3:00 PM" },

    { id: "cot-3d-1700", name: "3D 5:00 PM", digits: 3, multiplier: 500, isNational: true, gameFormat: '3D', time: "5:00 PM" },
    { id: "cot-2d-1700", name: "2D 5:00 PM", digits: 2, multiplier: 70, isNational: true, gameFormat: 'standard', time: "5:00 PM" },

    { id: "cot-l3d-1900", name: "Local 3D 7:00 PM", digits: 3, multiplier: 550, isNational: false, gameFormat: 'L3D', time: "7:00 PM" },
    { id: "cot-l2d-1900", name: "Local 2D 7:00 PM", digits: 2, multiplier: 70, isNational: false, gameFormat: 'standard', time: "7:00 PM" },

    { id: "cot-3d-2100", name: "3D 9:00 PM", digits: 3, multiplier: 500, isNational: true, gameFormat: '3D', time: "9:00 PM" },
    { id: "cot-l2-2100", name: "L2 9:00 PM", digits: 2, multiplier: 70, isNational: true, gameFormat: 'standard', time: "9:00 PM" }
];

export const getGameTypes = (company: string = ""): GameType[] => {
    const lower = company.toLowerCase();
    
    if (lower.includes("cotabato")) {
        return cotabatoGameTypes;
    }
    
    if (lower.includes("imperial")) {
        // Imperial renames Swer3L2 to Local 2D
        return defaultGameTypes.map(gt => {
            if (gt.name.includes("Swer3L2")) {
                return { ...gt, name: gt.name.replace("Swer3L2", "Local 2D"), id: gt.id + "-imp" };
            }
            return gt;
        });
    }
    
    if (lower.includes("glowing") || lower.includes("lanaosur") || lower.includes("lanaonorte")) {
        // These managers simply don't have the game
        return defaultGameTypes.filter(gt => !gt.name.includes("Swer3L2") && !gt.name.includes("3DL2"));
    }
    
    return defaultGameTypes;
};

export const gameTypes = defaultGameTypes;
