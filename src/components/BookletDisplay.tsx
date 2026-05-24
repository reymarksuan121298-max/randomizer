import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Booklet } from "@/types/lottery";
import { SheetCard } from "./SheetCard";
import { Printer, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookletDisplayProps {
    booklet: Booklet;
    index: number;
}

export const BookletDisplay = ({ booklet, index }: BookletDisplayProps) => {
    return (
        <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl">Booklet #{index + 1}</CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="gap-1">
                                <Printer className="h-4 w-4" /> Print All
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1">
                                <FileSpreadsheet className="h-4 w-4" /> Export This
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="p-3 bg-white rounded-lg border shadow-sm">
                            <div className="text-muted-foreground text-xs uppercase font-bold">Total Sheets</div>
                            <div className="text-xl font-bold">{booklet.sheets.length}</div>
                        </div>
                        <div className="p-3 bg-white rounded-lg border shadow-sm">
                            <div className="text-muted-foreground text-xs uppercase font-bold">Total Revenue</div>
                            <div className="text-xl font-bold text-blue-600">₱{booklet.revenue.toLocaleString()}</div>
                        </div>
                        <div className="p-3 bg-white rounded-lg border shadow-sm">
                            <div className="text-muted-foreground text-xs uppercase font-bold">Total Payout</div>
                            <div className="text-xl font-bold text-red-600">₱{(booklet.payout || 0).toLocaleString()}</div>
                        </div>
                        <div className="p-3 bg-white rounded-lg border shadow-sm">
                            <div className="text-muted-foreground text-xs uppercase font-bold">Net Margin</div>
                            <div className="text-xl font-bold text-green-600">₱{(booklet.revenue - (booklet.payout || 0)).toLocaleString()}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {booklet.sheets.map((sheet) => (
                    <SheetCard key={sheet.id} sheet={sheet} />
                ))}
            </div>
        </div>
    );
};