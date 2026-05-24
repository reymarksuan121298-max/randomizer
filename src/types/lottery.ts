export interface GameType {
    id: string;
    name: string;
    digits: number;
    multiplier: number;
    time?: string;
    isNational: boolean;
    gameFormat?: 'standard' | 'pares_p2' | 'pares_p3';
    numberRangeMin?: number;
    numberRangeMax?: number;
    ekisMultiplier?: number;
    rumbleMultiplier?: number;
}

export interface NumberBet {
    number: string;
    bet: number;
    label: string;
    gameTypeId: string;
    gameTypeName: string;
    gameTypeTime?: string;
}

export interface Ticket {
    label: string;
    numberBets: NumberBet[];
    serialNumber?: string;
    gameTypeId?: string;
}

export interface Sheet {
    id: string;
    tickets: Ticket[];
    totalBets?: number;
    gameTypeId?: string;
}

export interface Booklet {
    id: string;
    bookletNumber: number;
    sheets: Sheet[];
    revenue: number;
    payout?: number;
    totalBets?: number;
    province?: string;
    totalBooklets?: number;
    generatedAt?: string;
}

export interface BookletBatch {
    id?: string;
    name?: string;
    date: string;
    booklets: Booklet[];
    grandTotalBets: number;
    totalPayout?: number;
    province?: string;
    totalDailyRevenue?: number;
    totalBooklets?: number;
    generatedAt?: string;
    drawRevenuePercentages?: Record<string, number>;
}

export interface WinningNumbers {
    [gameTypeId: string]: string;
}
