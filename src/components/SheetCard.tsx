import type { Sheet } from "@/types/lottery";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface SheetCardProps {
    sheet: Sheet;
}

export const SheetCard = ({ sheet }: SheetCardProps) => {
    return (
        <Card className="shadow-sm border-2">
            <CardHeader className="py-3 bg-muted/50 border-b">
                <CardTitle className="text-sm font-bold flex justify-between">
                    <span>Sheet ID: {sheet.id}</span>
                    <span className="text-muted-foreground">₱{sheet.tickets.reduce((sum, t) => sum + t.numberBets.reduce((s, nb) => s + nb.bet, 0), 0)}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 gap-4">
                {sheet.tickets.map((ticket) => (
                    <div key={ticket.label} className="border rounded px-3 py-2 bg-card">
                        <div className="text-xs font-bold text-primary mb-1">Ticket {ticket.label}</div>
                        <div className="grid grid-cols-3 gap-2">
                            {ticket.numberBets.map((nb, idx) => (
                                <div key={idx} className="flex flex-col items-center">
                                    <span className="text-lg font-mono font-bold leading-none">{nb.number}</span>
                                    <span className="text-[10px] text-muted-foreground mt-1">₱{nb.bet}</span>
                                    <span className="text-[8px] uppercase font-semibold text-primary/70">{nb.gameTypeName.split(' ')[0]}</span>
                                </div>
                            ))}
                            {ticket.numberBets.length === 0 && (
                                <div className="col-span-3 text-[10px] text-center text-muted-foreground italic py-2">No bets</div>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};
