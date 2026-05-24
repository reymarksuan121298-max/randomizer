import { useState, useEffect } from "react";
import type { GameType } from "@/types/lottery";
import { gameTypes as defaultGameTypes } from "@/data/gameTypes";

export const useGameTypes = () => {
    const [gameTypes, setGameTypes] = useState<GameType[]>(defaultGameTypes);

    useEffect(() => {
        const saved = localStorage.getItem('custom_game_types');
        if (saved) {
            setGameTypes(JSON.parse(saved));
        }
    }, []);

    const addGameType = (newType: GameType) => {
        const updated = [...gameTypes, newType];
        setGameTypes(updated);
        localStorage.setItem('custom_game_types', JSON.stringify(updated));
    };

    return { gameTypes, addGameType };
};
