import { useMemo, useState } from "react";
import type { BookletBatch, Sheet, Ticket } from "@/types/lottery";

const ALL_DRAW_TIMES = [
    { time: "10:30 AM", type: "LOC" },
    { time: "2:00 PM", type: "NAT" },
    { time: "3:00 PM", type: "LOC" },
    { time: "5:00 PM", type: "NAT" },
    { time: "7:00 PM", type: "LOC" },
    { time: "9:00 PM", type: "NAT" },
];

const formatK = (num: number) => {
    if (num === 0) return '0';
    if (num >= 1000) {
        return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'K';
    }
    return num.toString();
};

export const SheetList = ({
    batch,
    selectedBookletIdx,
    onDataChange,
}: {
    batch: BookletBatch;
    selectedBookletIdx: number;
    onDataChange?: () => void;
}) => {
    const [selectedTime, setSelectedTime] = useState<string>("ALL");

    const bookletsToProcess =
        selectedBookletIdx === -1
            ? batch.booklets
            : [batch.booklets[selectedBookletIdx]];

    // Gather all sheets
    const allSheets = useMemo(() => {
        const sheets: { booklet: number; sheet: Sheet }[] = [];
        bookletsToProcess.forEach((b) => {
            b.sheets.forEach((s) => {
                sheets.push({ booklet: b.bookletNumber, sheet: s });
            });
        });
        return sheets;
    }, [bookletsToProcess]);

    const timeStats = useMemo(() => {
        const stats: Record<string, { revenue: number; payout: number; winners: number }> = {};
        ALL_DRAW_TIMES.forEach(dt => {
            stats[dt.time] = { revenue: 0, payout: 0, winners: 0 };
        });
        
        bookletsToProcess.forEach((b) => {
            b.sheets.forEach((s) => {
                s.tickets.forEach(t => {
                    t.numberBets.forEach(bet => {
                        if (bet.gameTypeTime && stats[bet.gameTypeTime]) {
                            stats[bet.gameTypeTime].revenue += bet.bet;
                            stats[bet.gameTypeTime].payout += (bet.payout || 0);
                            if (bet.payout && bet.payout > 0) {
                                stats[bet.gameTypeTime].winners++;
                            }
                        }
                    });
                });
            });
        });
        return stats;
    }, [bookletsToProcess]);

    const filteredSheets = useMemo(() => {
        if (selectedTime === "ALL") return allSheets;
        return allSheets.filter((s) => {
            return s.sheet.tickets.some(t => t.numberBets.some(b => b.gameTypeTime === selectedTime));
        });
    }, [allSheets, selectedTime]);

    return (
        <div className="mt-8">
            <div className="flex flex-wrap justify-center gap-2 mb-6">
                <button
                    className={`rounded-md border border-slate-200 px-4 py-2 flex flex-col justify-center items-center transition-colors ${
                        selectedTime === "ALL"
                            ? "bg-[#f7b500] text-slate-950 border-[#f7b500]"
                            : "bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                    onClick={() => setSelectedTime("ALL")}
                >
                    <div className="text-[10px] font-black uppercase">ALL SHEETS ({allSheets.length})</div>
                </button>
                {ALL_DRAW_TIMES.map((dt) => {
                    const stat = timeStats[dt.time];
                    
                    return (
                        <button
                            key={dt.time}
                            className={`rounded-md border border-slate-200 px-3 py-1 flex flex-col justify-center items-center transition-colors ${
                                selectedTime === dt.time
                                    ? "bg-[#f7b500] text-slate-950 border-[#f7b500]"
                                    : "bg-white text-slate-500 hover:bg-slate-50"
                            }`}
                            onClick={() => setSelectedTime(dt.time)}
                        >
                            <div className="text-[9px] font-black uppercase mb-0.5">{dt.time} ({dt.type})</div>
                            <div className={`text-[8px] font-bold ${selectedTime === dt.time ? 'text-slate-800' : 'text-slate-400'}`}>
                                ₱{formatK(stat.revenue)} → ₱{formatK(stat.payout)}
                                {stat.winners > 0 && <span className="ml-1 text-[#f7b500]"> • 🏆 {stat.winners}</span>}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {filteredSheets.map((s, i) => (
                    <SheetCardDetail
                        key={`${s.booklet}-${s.sheet.id}-${i}`}
                        sheet={s.sheet}
                        onDataChange={onDataChange}
                    />
                ))}
            </div>
        </div>
    );
};

const SheetCardDetail = ({ sheet, onDataChange }: { sheet: Sheet; onDataChange?: () => void }) => {
    const sortedTickets = [...sheet.tickets].sort((a, b) => b.label.localeCompare(a.label));
    
    const serials = sheet.tickets
        .map((t) => t.serialNumber)
        .filter((s) => s)
        .sort();
    
    let serialHeader = "NO SERIAL";
    if (serials.length > 0) {
        if (serials.length === 1) {
            serialHeader = `#${serials[0]?.slice(-9)}`;
        } else {
            serialHeader = `#${serials[0]?.slice(-9)} - #${serials[serials.length - 1]?.slice(-9)}`;
        }
    }

    const totalBet = sheet.tickets.reduce(
        (sum, t) => sum + t.numberBets.reduce((s, nb) => s + nb.bet, 0),
        0
    );

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col p-4">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
                <div className="text-lg font-black text-[#f7b500]">{serialHeader}</div>
                <div className="text-sm font-bold text-slate-400">
                    ₱{totalBet.toLocaleString()}
                </div>
            </div>
            
            <div className="space-y-6 flex-1">
                {sortedTickets.map((ticket) => (
                    <TicketRow key={ticket.label} ticket={ticket} onDataChange={onDataChange} />
                ))}
            </div>
        </div>
    );
};

const TicketRow = ({ ticket, onDataChange }: { ticket: Ticket; onDataChange?: () => void }) => {
    const bets = ticket.numberBets;
    const ticketTotal = bets.reduce((s, nb) => s + nb.bet, 0);
    
    // We expect up to 3 bets
    const slot1 = bets[0];
    const slot2 = bets[1];
    const slot3 = bets[2];

    return (
        <div className="flex flex-col bg-slate-50 rounded-lg p-3">
            <div className="flex justify-between items-end mb-3">
                <div className="text-xl font-black text-[#f7b500] leading-none">{ticket.label}</div>
                <div className="text-xs font-bold text-slate-800 tracking-tight">
                    {ticket.serialNumber ? `#${ticket.serialNumber}` : ""} <span className="text-[#f7b500] ml-1">₱{ticketTotal.toLocaleString()}</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <BetSlot bet={slot1} onDataChange={onDataChange} />
                <BetSlot bet={slot2} onDataChange={onDataChange} />
                <BetSlot bet={slot3} onDataChange={onDataChange} />
            </div>
        </div>
    );
};

const BetSlot = ({ bet, onDataChange }: { bet?: any; onDataChange?: () => void }) => {
    if (!bet) {
        return (
            <div className="flex flex-col items-center justify-center rounded-sm border border-slate-100 bg-slate-50/50 py-3 h-24">
            </div>
        );
    }

    const isWinner = bet.payout && bet.payout > 0;
    const boxColor = isWinner ? "border-2 border-[#f7b500] bg-[#fffcf2] animate-glow" : "border border-white bg-white shadow-sm";
    const titleColor = isWinner ? "text-slate-700" : "text-[#f7b500]";
    
    return (
        <div className={`flex flex-col items-center justify-start rounded-lg ${boxColor} py-3 relative min-h-[7rem]`}>
            <div className={`text-[9px] font-bold ${titleColor} uppercase leading-tight`}>
                {bet.gameTypeName?.split(" ")[0]}
            </div>
            <div className="text-[8px] font-bold text-slate-400 uppercase mb-2">
                {bet.gameTypeTime}
            </div>
            
            <div className="text-2xl font-black text-slate-800 leading-none my-1">
                {bet.number}
            </div>
            
            <div className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5 mt-1">
                ₱ 
                <input
                    type="number"
                    min="1"
                    className={`w-12 rounded border border-transparent hover:border-slate-200 px-1 py-0.5 text-center transition-colors focus:border-[#f7b500] focus:outline-none focus:ring-1 focus:ring-[#f7b500] ${isWinner ? 'bg-transparent text-slate-800' : 'bg-transparent text-slate-800'}`}
                    value={bet.bet}
                    onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        bet.bet = val;
                        if (onDataChange) onDataChange();
                    }}
                />
            </div>
            
            {isWinner && (
                <div className="mt-2 flex flex-col items-center">
                    <div className="text-[9px] font-bold text-slate-600">
                        Win: <span className="text-slate-800">₱{bet.payout.toLocaleString()}</span>
                    </div>
                    <div className="text-[8px] text-slate-400 mt-0.5">
                        (500x)
                    </div>
                </div>
            )}
        </div>
    );
};
