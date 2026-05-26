import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    ChevronDown,
    Download,
    Eye,
    FileSpreadsheet,
    FileText,
    Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetList } from "@/components/SheetList";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BookletBatch } from "@/types/lottery";
import { exportAlphaList } from "@/utils/alphaListExport";
import { exportToCSV } from "@/utils/csvExport";
import { exportToExcel } from "@/utils/excelExport";
import { toast } from "sonner";
import { databaseEnabled, getBatchDetailFromDatabase } from "@/lib/database";

type DrawSummary = {
    time: string;
    sheets: Set<string>;
    revenue: number;
    payout: number;
    winners: number;
};

const DRAW_ORDER = ["10:30 AM", "2:00 PM", "3:00 PM", "5:00 PM", "7:00 PM", "9:00 PM"];

export const BatchDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [batchData, setBatchData] = useState<BookletBatch | null>(null);
    const [selectedBookletIdx, setSelectedBookletIdx] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!id) return;

            if (databaseEnabled()) {
                try {
                    const dbBatch = await getBatchDetailFromDatabase(id);
                    if (dbBatch && !cancelled) {
                        setBatchData(dbBatch);
                        localStorage.setItem(`batch_data_${id}`, JSON.stringify(dbBatch));
                        return;
                    }
                } catch (error) {
                    console.error(error);
                    toast.error("Could not load this batch from database. Trying local data.");
                }
            }

            const saved = localStorage.getItem(`batch_data_${id}`);
            if (saved && !cancelled) {
                setBatchData(JSON.parse(saved));
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [id]);

    const analysis = useMemo(() => {
        if (!batchData) return null;

        const bookletsToProcess = selectedBookletIdx === -1 
            ? batchData.booklets 
            : [batchData.booklets[selectedBookletIdx]];

        if (!bookletsToProcess[0]) return null;

        const drawMap = new Map<string, DrawSummary>();
        const gameTypes = new Set<string>();
        const winningMap = new Map<string, { label: string; number: string; payout: number }>();
        let explicitPayout = 0;
        let selectedRevenue = 0;

        bookletsToProcess.forEach((booklet) => {
            selectedRevenue += booklet.totalBets || booklet.revenue || 0;
            booklet.sheets.forEach((sheet) => {
                sheet.tickets.forEach((ticket) => {
                    ticket.numberBets.forEach((bet) => {
                        const time = bet.gameTypeTime || "Unscheduled";
                        const gameName = bet.gameTypeName || "Game";
                        const key = `${time}-${gameName}`;
                        gameTypes.add(key);

                        if (!drawMap.has(time)) {
                            drawMap.set(time, {
                                time,
                                sheets: new Set<string>(),
                                revenue: 0,
                                payout: 0,
                                winners: 0,
                            });
                        }

                        const draw = drawMap.get(time)!;
                        draw.sheets.add(`${booklet.bookletNumber}-${sheet.id}`);
                        draw.revenue += bet.bet;

                        if (!winningMap.has(key)) {
                            const explicitNumber = (batchData as any).winningNumbers?.[bet.gameTypeId || ""];
                            winningMap.set(key, {
                                label: `${gameName}_${time}`.replace(/\s+/g, ""),
                                number: explicitNumber || "TBD",
                                payout: 0,
                            });
                        }

                        const payout = Number((bet as any).payout || (bet as any).payoutAmount || (bet as any).win || 0);
                        if (payout > 0) {
                            draw.payout += payout;
                            draw.winners += 1;
                            explicitPayout += payout;
                            const existing = winningMap.get(key);
                            if (existing) {
                                existing.payout += payout;
                                if (existing.number === "TBD") {
                                    existing.number = bet.number;
                                }
                            }
                        }
                    });
                });
            });
        });

        const totalPayout = selectedBookletIdx === -1 
            ? (batchData.totalPayout || explicitPayout || 0)
            : (explicitPayout || Math.round(((batchData.totalPayout || 0) * selectedRevenue) / (batchData.grandTotalBets || batchData.totalDailyRevenue || 1)));
            
        const totalRevenue = selectedBookletIdx === -1
            ? (batchData.grandTotalBets || batchData.totalDailyRevenue || 0)
            : selectedRevenue;
        const drawSummaries = Array.from(drawMap.values()).sort((a, b) => {
            const ai = DRAW_ORDER.indexOf(a.time);
            const bi = DRAW_ORDER.indexOf(b.time);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });

        const payoutFromDraws = drawSummaries.reduce((sum, draw) => sum + draw.payout, 0);
        if (payoutFromDraws === 0 && totalPayout > 0 && totalRevenue > 0) {
            drawSummaries.forEach((draw) => {
                draw.payout = Math.round((draw.revenue / totalRevenue) * totalPayout);
            });
        }

        return {
            totalRevenue,
            totalPayout,
            gameTypeCount: gameTypes.size,
            prizeFund: totalRevenue * 0.339,
            drawSummaries,
            winningNumbers: Array.from(winningMap.values()).slice(0, 6),
        };
    }, [batchData, selectedBookletIdx]);

    const handleDataChange = () => {
        if (!batchData) return;
        const newData = { ...batchData };
        
        let newGrandTotal = 0;
        newData.booklets.forEach(b => {
            let bTotal = 0;
            b.sheets.forEach(s => {
                s.tickets.forEach(t => {
                    t.numberBets.forEach(nb => {
                        bTotal += nb.bet;
                    });
                });
            });
            b.revenue = bTotal;
            b.totalBets = bTotal;
            newGrandTotal += bTotal;
        });
        
        newData.grandTotalBets = newGrandTotal;
        newData.totalDailyRevenue = newGrandTotal;
        
        setBatchData(newData);
        if (newData.id) {
            localStorage.setItem(`batch_data_${newData.id}`, JSON.stringify(newData));
        }
    };

    const runReport = async (kind: string) => {
        if (!batchData) return;
        try {
            if (kind === "csv") {
                exportToCSV(batchData);
                toast.success("CSV exported.");
            } else if (kind === "alpha") {
                await exportAlphaList(batchData);
                toast.success("Alpha list exported.");
            } else if (kind === "dsr") {
                navigate(`/batch/${id}/preview/dsr`);
            } else if (kind === "sod") {
                navigate(`/batch/${id}/preview/sod`);
            } else {
                await exportToExcel(batchData, batchData.booklets);
                toast.success("Excel exported.");
            }
        } catch {
            toast.error("Report export failed.");
        }
    };

    if (!batchData || !analysis) {
        return (
            <div className="mx-auto max-w-xl py-20 text-center">
                <h2 className="mb-4 text-2xl font-bold">Batch data not found or not yet generated</h2>
                <Button asChild>
                    <Link to={`/batch/${id}/edit`}>Go to Generation Page</Link>
                </Button>
            </div>
        );
    }

    const createdDate = batchData.generatedAt || batchData.date;

    return (
        <main className="min-h-screen bg-[#f7f8fa] px-6 py-5 text-slate-950">
            <div className="mx-auto max-w-[1180px] space-y-6">
                <header className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <Button
                            variant="outline"
                            className="h-8 rounded-md border-slate-200 bg-white px-4 text-[10px] font-black uppercase"
                            onClick={() => navigate("/batches")}
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to Batches
                        </Button>
                        <div>
                            <h1 className="font-mono text-xl font-black uppercase leading-none text-[#f7b500]">
                                {batchData.id || id}
                            </h1>
                            <p className="mt-2 text-xs uppercase text-slate-600">
                                {batchData.province || batchData.name} - Created {new Date(createdDate).toLocaleDateString("en-US")}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <ReportsMenu onRun={runReport} />
                        <span className="inline-flex h-8 items-center gap-1 rounded-full bg-emerald-100 px-3 text-xs font-bold text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Approved
                        </span>
                    </div>
                </header>

                <section className="rounded-lg border-2 border-[#f7b500] bg-white p-5">
                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-5">
                        <Metric label="Total Booklets" value={String(batchData.booklets.length)} accent="text-[#f7b500]" accentBorder />
                        <Metric label="Daily Revenue" value={formatMoney(analysis.totalRevenue)} />
                        <Metric label="Grand Total Bets" value={formatMoney(batchData.grandTotalBets)} accent="text-[#f7b500]" />
                        <Metric label="Total Payout" value={formatMoney(analysis.totalPayout)} danger />
                        <Metric label="Prize Fund (33.9% of Daily Revenue)" value={formatMoney(analysis.prizeFund)} purple />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                        <Metric label="Game Types" value={`${analysis.gameTypeCount} types`} />
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-6 border-t border-slate-200 pt-4 text-xs">
                        <Info label="Created By" value={(batchData as any).createdBy || "Not recorded"} />
                        <Info label="Company" value={batchData.name || batchData.province || "Not recorded"} />
                        <Info label="Approved By" value={(batchData as any).approvedBy || "Not recorded"} />
                    </div>

                    <div className="mt-6">
                        <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-[#f7b500]">
                            <Trophy className="h-4 w-4" />
                            Winning Numbers
                        </h2>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                            {analysis.winningNumbers.map((winner) => (
                                <div key={winner.label} className="rounded-lg bg-slate-50 px-4 py-3 text-center">
                                    <div className="truncate text-[10px] uppercase text-slate-500">{winner.label}</div>
                                    <div className="mt-1 font-mono text-xl font-black text-[#f7b500]">{winner.number}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 rounded-md border border-[#f7b500] bg-[#fff8e6] px-4 py-3 text-xs text-amber-700">
                        <span className="inline-flex items-center gap-2 font-black">
                            <AlertTriangle className="h-4 w-4" />
                            Important:
                        </span>{" "}
                        Please verify that the Grand Total Bets ({formatMoney(batchData.grandTotalBets)}) and Total Payout ({formatMoney(analysis.totalPayout)}) match your daily sales report.
                    </div>
                </section>

                <section className="rounded-lg border-2 border-[#f7b500] bg-white p-5">
                    <h2 className="mb-4 text-sm font-black uppercase text-[#f7b500]">
                        PER-DRAW SUMMARY ({selectedBookletIdx === -1 ? "ALL BOOKLETS" : `BOOKLET ${selectedBookletIdx + 1}`})
                    </h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {analysis.drawSummaries.map((draw) => (
                            <DrawCard key={draw.time} draw={draw} />
                        ))}
                    </div>
                </section>


                <div className="flex flex-wrap justify-center gap-3">
                    <button
                        className={`rounded-md border-2 px-4 py-2 font-mono text-[10px] font-black uppercase transition-colors ${selectedBookletIdx === -1
                            ? "border-black bg-[#f7b500] text-slate-950"
                            : "border-transparent bg-white text-slate-500 hover:bg-slate-50"
                            }`}
                        onClick={() => setSelectedBookletIdx(-1)}
                    >
                        ALL BOOKLETS
                    </button>
                    {batchData.booklets.map((booklet, idx) => (
                        <button
                            key={booklet.id}
                            className={`rounded-md border-2 px-4 py-2 font-mono text-[10px] font-black uppercase transition-colors ${selectedBookletIdx === idx
                                ? "border-black bg-[#f7b500] text-slate-950"
                                : "border-transparent bg-white text-slate-500 hover:bg-slate-50"
                                }`}
                            onClick={() => setSelectedBookletIdx(idx)}
                        >
                            BOOKLET {idx + 1}
                        </button>
                    ))}
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="w-32"></div>
                    <div className="flex-1 text-center">
                        <h3 className="text-xs font-black uppercase text-[#5f849c]">
                            {batchData.province || batchData.name} {selectedBookletIdx !== -1 && `(${batchData.booklets[selectedBookletIdx].id || `Booklet ${selectedBookletIdx + 1}`})`}
                        </h3>
                        <div className="my-2 font-mono text-3xl font-black text-[#f7b500]">
                            {formatMoney(analysis.totalRevenue)}
                        </div>
                        <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-500">
                            <span>Total Bets: {formatMoney(analysis.totalRevenue)}</span>
                            <span className="font-bold text-[#f7b500]">Total Prizes: {formatMoney(analysis.totalPayout)}</span>
                        </div>
                    </div>
                    <div className="w-32 text-right">
                        <Button variant="outline" className="h-9 text-xs font-medium text-slate-700" onClick={() => runReport("csv")}>
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>
                </div>

                <SheetList batch={batchData} selectedBookletIdx={selectedBookletIdx} onDataChange={handleDataChange} />
            </div>
        </main>
    );
};

const ReportsMenu = ({ onRun }: { onRun: (kind: string) => void }) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button
                variant="outline"
                className="h-9 rounded-md border-[#f7b500] bg-white px-4 text-[10px] font-black uppercase text-slate-950"
            >
                <FileText className="h-4 w-4" />
                Reports
                <ChevronDown className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-md border-slate-200 bg-white p-1 text-slate-950 shadow-lg">
            <ReportItem icon={<Download className="h-4 w-4" />} label="Export CSV (Detailed)" onClick={() => onRun("csv")} />
            <ReportItem icon={<FileText className="h-4 w-4" />} label="Export Table (Simple)" onClick={() => onRun("table")} />
            <ReportItem icon={<FileSpreadsheet className="h-4 w-4" />} label="Export Excel (Formatted)" onClick={() => onRun("excel")} />
            <ReportItem icon={<Trophy className="h-4 w-4" />} label="Daily/Batch Alpha List" onClick={() => onRun("alpha")} />
            <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2 rounded-sm bg-white py-2 text-xs font-medium text-slate-700 focus:bg-slate-50">
                    <Trophy className="h-4 w-4" />
                    Booklet Alpha Lists
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-md border-slate-200 bg-white p-1 text-slate-950 shadow-lg">
                    <DropdownMenuItem className="rounded-sm py-2 text-xs" onClick={() => onRun("alpha")}>
                        All Booklets
                    </DropdownMenuItem>
                </DropdownMenuSubContent>
            </DropdownMenuSub>
            <ReportItem icon={<Eye className="h-4 w-4" />} label="DSR Preview" onClick={() => onRun("dsr")} />
            <ReportItem icon={<Eye className="h-4 w-4" />} label="SOD Preview" onClick={() => onRun("sod")} />
        </DropdownMenuContent>
    </DropdownMenu>
);

const ReportItem = ({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) => (
    <DropdownMenuItem className="gap-2 rounded-sm bg-white py-2 text-xs font-medium text-slate-700 focus:bg-slate-50" onClick={onClick}>
        {icon}
        {label}
    </DropdownMenuItem>
);

const Metric = ({ label, value, accent, danger, purple, accentBorder }: { label: string; value: string; accent?: string; danger?: boolean; purple?: boolean; accentBorder?: boolean }) => (
    <div className={`rounded-lg bg-slate-50 px-4 py-4 ${danger ? "border-l-2 border-red-500" : ""} ${purple ? "border-l-2 border-purple-500" : ""} ${accentBorder ? "border-l-2 border-[#f7b500]" : ""}`}>
        <div className="mb-2 text-[10px] text-slate-500">{label}</div>
        <div className={`font-mono text-base font-black ${danger ? "text-red-500" : purple ? "text-purple-600" : accent || "text-slate-950"}`}>
            {value}
        </div>
    </div>
);

const Info = ({ label, value }: { label: string; value: string }) => (
    <div>
        <div className="text-[10px] text-slate-500">{label}</div>
        <div className="text-xs font-black text-slate-950">{value}</div>
    </div>
);

const DrawCard = ({ draw }: { draw: DrawSummary }) => {
    const net = draw.revenue - draw.payout;
    const margin = draw.revenue > 0 ? (net / draw.revenue) * 100 : 0;
    const isNegative = net < 0;
    const netSign = net > 0 ? "+" : "";

    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-[#f7b500]">{draw.time}</h3>
                {draw.winners > 0 && (
                    <span className="flex items-center gap-1 rounded bg-[#fff0bf] px-2 py-1 text-[10px] font-black text-[#c18300]">
                        <Trophy className="h-3 w-3" /> {draw.winners}
                    </span>
                )}
            </div>
            <DrawLine label="Sheets:" value={String(draw.sheets.size)} />
            <DrawLine label="Revenue:" value={formatMoney(draw.revenue)} good />
            <DrawLine label="Payout:" value={formatMoney(draw.payout)} bad={draw.payout > 0} />
            <div className="mt-3 border-t border-slate-200 pt-2">
                <DrawLine label="Net Profit:" value={`${netSign}${formatMoney(net)} (${margin.toFixed(1)}%)`} blue={!isNegative} bad={isNegative} />
            </div>
        </div>
    );
};

const DrawLine = ({ label, value, good, bad, blue }: { label: string; value: string; good?: boolean; bad?: boolean; blue?: boolean }) => (
    <div className="flex items-center justify-between py-1 text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={`font-mono font-black ${good ? "text-green-600" : bad ? "text-red-500" : blue ? "text-blue-600" : "text-slate-950"}`}>
            {value}
        </span>
    </div>
);

const formatMoney = (value: number) => `₱${Math.round(value || 0).toLocaleString()}`;
