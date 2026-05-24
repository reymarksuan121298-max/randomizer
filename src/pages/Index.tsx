import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Calendar, Settings, List, FileText, Copy, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateBookletBatch } from "@/utils/lotteryGenerator";
import { gameTypes } from "@/data/gameTypes";
import type { WinningNumbers } from "@/types/lottery";
import type { Batch } from "./BatchesPage";

const BATCHES_KEY = "batches";

const Index = () => {
    const navigate = useNavigate();
    const [betDistribution, setBetDistribution] = useState([80]);
    const [isPerDrawEnabled, setIsPerDrawEnabled] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [drawDistributions, setDrawDistributions] = useState([
        { time: "10:30 AM", percentage: 20 },
        { time: "2:00 PM", percentage: 16 },
        { time: "3:00 PM", percentage: 16 },
        { time: "5:00 PM", percentage: 16 },
        { time: "7:00 PM", percentage: 16 },
        { time: "9:00 PM", percentage: 16 }
    ]);

    // Form state
    const [company, setCompany] = useState("Cotabato City - Imperial");
    const [companyCode, setCompanyCode] = useState("ADS");
    const [dailyRevenue, setDailyRevenue] = useState(2000000);
    const [totalPayout, setTotalPayout] = useState(50000);
    const [bookletCount, setBookletCount] = useState(1);
    const [minBet, setMinBet] = useState(5);
    const [maxBet, setMaxBet] = useState(150);
    const [serialStart, setSerialStart] = useState("1000001");
    const [serialEnd, setSerialEnd] = useState("1000250");

    // Winning numbers for each game type ref (per-input)
    const winningInputs = useRef<Record<string, HTMLInputElement | null>>({});

    const gameTypesList = [
        { name: "Local 3D 10:30 AM", multiplier: "550x", type: "Local", format: "000-999" },
        { name: "Local 2D 10:30 AM", multiplier: "70x", type: "Local", format: "00-99" },
        { name: "3D 2:00 PM", multiplier: "500x", type: "National", format: "000-999" },
        { name: "2D 2:00 PM", multiplier: "70x", type: "National", format: "00-99" },
        { name: "Local 3D 3:00 PM", multiplier: "550x", type: "Local", format: "000-999" },
        { name: "Local 2D 3:00 PM", multiplier: "70x", type: "Local", format: "00-99" },
        { name: "3D 5:00 PM", multiplier: "500x", type: "National", format: "000-999" },
        { name: "2D 5:00 PM", multiplier: "70x", type: "National", format: "00-99" },
        { name: "Local 3D 7:00 PM", multiplier: "550x", type: "Local", format: "000-999" },
        { name: "Local 2D 7:00 PM", multiplier: "70x", type: "Local", format: "00-99" },
        { name: "3D 9:00 PM", multiplier: "500x", type: "National", format: "000-999" },
        { name: "L2 9:00 PM", multiplier: "70x", type: "National", format: "00-99" },
    ];

    const todayDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const handleGenerate = async () => {
        if (!company.trim()) {
            toast.error("Company name is required.");
            return;
        }
        if (dailyRevenue <= 0) {
            toast.error("Daily revenue must be greater than 0.");
            return;
        }
        if (bookletCount < 1) {
            toast.error("Number of booklets must be at least 1.");
            return;
        }
        if (minBet <= 0 || maxBet <= 0 || minBet > maxBet) {
            toast.error("Invalid bet range. Min bet must be less than max bet.");
            return;
        }

        setIsGenerating(true);

        try {
            // Build winning numbers from input refs
            const winningNumbers: WinningNumbers = {};
            gameTypes.forEach(gt => {
                const input = winningInputs.current[gt.id];
                if (input && input.value.trim()) {
                    winningNumbers[gt.id] = input.value.trim();
                }
            });

            // Build draw revenue percentages
            let drawRevenuePercentages: Record<string, number> | undefined;
            const totalPercent = drawDistributions.reduce((s, d) => s + d.percentage, 0);
            if (isPerDrawEnabled && Math.abs(totalPercent - 100) < 0.1) {
                drawRevenuePercentages = {};
                drawDistributions.forEach(d => {
                    drawRevenuePercentages![d.time] = d.percentage;
                });
            }

            // Build serial ranges
            const startNum = parseInt(serialStart) || 1000001;
            const serialRanges: Array<{ start: string; end: string }> = [];
            for (let i = 0; i < bookletCount; i++) {
                const bookletStart = startNum + i * 250;
                const bookletEnd = bookletStart + 249;
                serialRanges.push({
                    start: bookletStart.toString(),
                    end: bookletEnd.toString(),
                });
            }

            // Run generation (may be CPU-heavy, use setTimeout to allow UI updates)
            await new Promise(resolve => setTimeout(resolve, 50));

            const batchData = generateBookletBatch(
                company,
                dailyRevenue,
                bookletCount,
                minBet,
                maxBet,
                betDistribution[0],
                serialRanges,
                gameTypes,
                totalPayout,
                winningNumbers,
                companyCode,
                drawRevenuePercentages
            );

            // Generate a batch ID
            const code = companyCode.toUpperCase().slice(0, 3);
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            const rand = Math.floor(Math.random() * 900000000 + 100000000);
            const batchId = `${code}-${dateStr}-${rand}`;

            // Attach id and name to the batch data
            batchData.id = batchId;
            batchData.name = `${company} – ${new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`;

            // Save as a batch entry in the batch list
            const newBatch: Batch = {
                id: batchId,
                name: batchData.name,
                province: company,
                date: new Date().toISOString().slice(0, 10),
                booklets: bookletCount,
                revenue: `₱${dailyRevenue.toLocaleString()}`,
                createdAt: new Date().toISOString(),
                createdBy: "Quick Generate",
                status: "generated",
                total_revenue: batchData.grandTotalBets,
                total_payout: batchData.totalPayout,
            };

            const existingRaw = localStorage.getItem(BATCHES_KEY);
            const existing: Batch[] = existingRaw ? JSON.parse(existingRaw) : [];
            existing.unshift(newBatch);
            localStorage.setItem(BATCHES_KEY, JSON.stringify(existing));

            // Save detailed batch data
            localStorage.setItem(`batch_data_${batchId}`, JSON.stringify(batchData));

            toast.success(`Generated ${bookletCount} booklet${bookletCount > 1 ? "s" : ""} successfully!`);
            navigate(`/batch/${batchId}`);
        } catch (err) {
            console.error(err);
            toast.error("Generation failed. Check console for details.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 text-slate-800 font-sans">
            {/* Header Section */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="flex items-center justify-between mb-6">
                    {/* Placeholder for left logo */}
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 via-red-500 to-yellow-400 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        <span className="opacity-90">PCSO</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-extrabold text-yellow-400 drop-shadow-sm tracking-tight">
                        STL TICKET SYSTEM
                    </h1>

                    {/* Placeholder for right logo */}
                    <div className="w-16 h-16 flex flex-col items-center justify-center font-black text-2xl border-4 border-slate-800 rounded relative overflow-hidden bg-white">
                        <div className="text-blue-600 absolute top-1 left-2">C</div>
                        <div className="text-red-600 absolute bottom-1 right-2">T</div>
                        <div className="w-full h-1 bg-yellow-400 absolute top-1/2 -translate-y-1/2"></div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> {todayDate}
                    </div>

                    <div className="flex flex-wrap justify-center gap-4">
                        <Button
                            variant="outline"
                            className="border-yellow-400 text-yellow-500 hover:bg-yellow-50 font-bold uppercase tracking-wide text-xs h-10 px-6 gap-2"
                            onClick={() => navigate('/company-settings')}
                        >
                            <Settings className="h-4 w-4" /> Company Settings
                        </Button>
                        <Button
                            variant="outline"
                            className="border-yellow-400 text-yellow-500 hover:bg-yellow-50 font-bold uppercase tracking-wide text-xs h-10 px-6 gap-2"
                            onClick={() => navigate('/batches')}
                        >
                            <List className="h-4 w-4" /> View Saved Batches
                        </Button>
                        <Button
                            variant="outline"
                            className="border-yellow-400 text-yellow-500 hover:bg-yellow-50 font-bold uppercase tracking-wide text-xs h-10 px-6 gap-2"
                            onClick={() => navigate('/prize-utilization')}
                        >
                            <FileText className="h-4 w-4" /> Prize Utilization
                        </Button>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-2 bg-slate-200/50 px-4 py-1.5 rounded-full font-medium">
                        <FileText className="h-3 w-3" />
                        50 Sheets per Booklet (11-{companyCode}-001 to 11-{companyCode}-050) • 250 Tickets Total
                    </div>
                </div>
            </div>

            {/* Main Form Card */}
            <Card className="max-w-4xl mx-auto shadow-xl border-slate-200/60 overflow-hidden bg-white/95 backdrop-blur-sm">
                <CardContent className="p-8 space-y-10">
                    <h2 className="text-2xl font-black text-center text-slate-800 tracking-tight uppercase">Generate Booklets</h2>

                    {/* Basic Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-800 tracking-wider">Company</Label>
                            <Input
                                value={company}
                                onChange={e => setCompany(e.target.value)}
                                className="h-12 bg-slate-50 font-mono text-sm"
                            />
                            <p className="text-[10px] text-slate-500 uppercase">Your assigned company and province</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-800 tracking-wider">Company Code</Label>
                            <Input
                                value={companyCode}
                                onChange={e => setCompanyCode(e.target.value.toUpperCase())}
                                className="h-12 bg-slate-50 font-mono text-sm"
                                maxLength={6}
                            />
                            <p className="text-[10px] text-slate-500 uppercase">Used in sheet IDs (e.g. 11-ADS-001)</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-800 tracking-wider">Daily Revenue (PHP)</Label>
                            <Input
                                type="number"
                                value={dailyRevenue}
                                onChange={e => setDailyRevenue(parseInt(e.target.value) || 0)}
                                step={1000}
                                className="h-12 bg-slate-50 font-mono text-sm"
                            />
                            <p className="text-[10px] text-slate-500 uppercase">Total revenue across all booklets</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-800 tracking-wider">Total Payout (PHP)</Label>
                            <Input
                                type="number"
                                value={totalPayout}
                                onChange={e => setTotalPayout(parseInt(e.target.value) || 0)}
                                step={500}
                                className="h-12 bg-slate-50 font-mono text-sm"
                            />
                            <p className="text-[10px] text-slate-500 uppercase">Total payout for winners</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-800 tracking-wider">Number of Booklets</Label>
                            <Input
                                type="number"
                                value={bookletCount}
                                min={1}
                                onChange={e => setBookletCount(parseInt(e.target.value) || 1)}
                                className="h-12 bg-slate-50 font-mono text-sm"
                            />
                            <p className="text-[10px] text-slate-500 uppercase">How many booklets per day (each will have varying revenue)</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-800 tracking-wider">Minimum Bet (PHP)</Label>
                            <Input
                                type="number"
                                value={minBet}
                                onChange={e => setMinBet(parseInt(e.target.value) || 5)}
                                className="h-12 bg-slate-50 font-mono text-sm"
                            />
                            <p className="text-[10px] text-slate-500 uppercase">Minimum bet per number</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-800 tracking-wider">Maximum Bet (PHP)</Label>
                            <Input
                                type="number"
                                value={maxBet}
                                onChange={e => setMaxBet(parseInt(e.target.value) || 150)}
                                className="h-12 bg-slate-50 font-mono text-sm"
                            />
                            <p className="text-[10px] text-slate-500 uppercase">Maximum bet per number</p>
                        </div>
                    </div>

                    {/* Per-Draw Revenue */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
                        <div className="flex items-center justify-between mb-1">
                            <h3
                                className="text-sm font-bold uppercase flex items-center gap-2 tracking-wider text-slate-800 cursor-pointer select-none"
                                onClick={() => setIsPerDrawEnabled(!isPerDrawEnabled)}
                            >
                                {isPerDrawEnabled ? (
                                    <CheckCircle2 className="h-5 w-5 text-yellow-400 fill-yellow-400 stroke-white" />
                                ) : (
                                    <Circle className="h-5 w-5 text-slate-300" />
                                )}
                                Per-Draw Revenue Distribution
                            </h3>
                            {isPerDrawEnabled && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-semibold px-4 bg-white border-slate-200 text-slate-700 hover:text-slate-900"
                                    onClick={() => setDrawDistributions(drawDistributions.map(d => ({ ...d, percentage: Number((100 / drawDistributions.length).toFixed(2)) })))}
                                >
                                    Even Split
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mb-8">Control what percentage of total revenue goes to each draw time</p>

                        {isPerDrawEnabled && (
                            <div className="space-y-6">
                                {drawDistributions.map((dist, i) => (
                                    <div key={dist.time} className="flex items-center justify-between">
                                        <Label className="text-sm font-semibold text-slate-800">{dist.time}</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                type="number"
                                                className="w-20 h-8 text-center bg-white border-slate-200 shadow-sm font-medium text-sm text-slate-700"
                                                value={dist.percentage}
                                                onChange={(e) => {
                                                    const newDist = [...drawDistributions];
                                                    newDist[i].percentage = Number(e.target.value);
                                                    setDrawDistributions(newDist);
                                                }}
                                            />
                                            <span className="text-sm font-medium text-slate-500 w-4">%</span>
                                        </div>
                                    </div>
                                ))}
                                <div className={`flex items-center justify-between rounded-lg p-4 mt-6 ${Math.abs(drawDistributions.reduce((s, d) => s + d.percentage, 0) - 100) < 0.1 ? 'bg-green-100/50 border border-green-200' : 'bg-red-100/50 border border-red-200'}`}>
                                    <span className="text-sm font-bold text-slate-800">Total</span>
                                    <span className={`text-sm font-black tracking-wide ${Math.abs(drawDistributions.reduce((s, d) => s + d.percentage, 0) - 100) < 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                                        {drawDistributions.reduce((sum, d) => sum + d.percentage, 0).toFixed(1)}%
                                        {Math.abs(drawDistributions.reduce((s, d) => s + d.percentage, 0) - 100) >= 0.1 && (
                                            <span className="text-xs ml-2 font-medium">(must equal 100%)</span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Payout Multipliers */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">Payout Multipliers (From Game Types)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-4 text-xs font-medium text-slate-600">
                            {gameTypesList.slice(0, 8).map((game, i) => (
                                <div key={i} className="flex justify-between border-b border-slate-200/60 pb-1">
                                    <span>{game.name}</span>
                                    <span className="font-bold text-slate-800">{game.multiplier}</span>
                                </div>
                            ))}
                            {gameTypesList.slice(8).map((game, i) => (
                                <div key={i + 8} className="flex justify-between border-b border-slate-200/60 pb-1">
                                    <span>{game.name}</span>
                                    <span className="font-bold text-slate-800">{game.multiplier}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase mt-4">Each game type has its own multiplier. Payout = bet × multiplier</p>
                    </div>

                    {/* Winning Numbers */}
                    <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50/30 p-6 shadow-sm">
                        <h3 className="text-sm font-bold border-b border-yellow-200 uppercase tracking-wider text-slate-800 mb-1 pb-2">Winning Numbers (Optional)</h3>
                        <p className="text-xs text-slate-500 mb-6">Enter winning numbers if you want to allocate a specific total payout</p>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-6">
                            {gameTypes.map((gt) => (
                                <div key={gt.id} className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs font-bold whitespace-nowrap">{gt.name}</Label>
                                        <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 h-4 uppercase ${gt.isNational ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                            {gt.isNational ? "National" : "Local"}
                                        </Badge>
                                    </div>
                                    <Input
                                        placeholder={gt.digits === 2 ? "00-99" : "000-999"}
                                        className="h-10 text-center font-mono tracking-widest text-slate-400 bg-white"
                                        ref={(el) => { winningInputs.current[gt.id] = el; }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Serial Number Ranges */}
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 border-b pb-2 mb-6">Serial Number Ranges (250 per Booklet)</h3>

                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h4 className="text-sm font-bold text-yellow-500 uppercase tracking-widest mb-4">Booklet 1 (Starting Range)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-slate-800">Serial Start</Label>
                                    <Input
                                        value={serialStart}
                                        onChange={e => {
                                            setSerialStart(e.target.value);
                                            const start = parseInt(e.target.value) || 1000001;
                                            setSerialEnd((start + bookletCount * 250 - 1).toString());
                                        }}
                                        className="h-12 bg-slate-50 font-mono text-sm"
                                    />
                                    <p className="text-[10px] text-slate-500 uppercase">Range: {bookletCount * 250} serials for {bookletCount} booklet{bookletCount !== 1 ? "s" : ""}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-slate-800">Serial End</Label>
                                    <Input
                                        value={serialEnd}
                                        readOnly
                                        className="h-12 bg-slate-100 font-mono text-sm text-slate-500 cursor-not-allowed"
                                    />
                                    <p className="text-[10px] text-slate-500 uppercase">Auto-calculated based on booklet count</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bet Distribution */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Bet Distribution</h3>
                            <button
                                className="text-[10px] text-slate-500 font-medium hover:text-slate-800"
                                onClick={() => setBetDistribution([80])}
                            >
                                Reset to 80/20
                            </button>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Multiples of 5</span>
                                    <span className="font-black text-yellow-500">{betDistribution[0]}%</span>
                                </div>
                                <Slider
                                    value={betDistribution}
                                    onValueChange={setBetDistribution}
                                    max={100}
                                    step={1}
                                    className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-yellow-400 [&_[role=slider]]:border-4 [&_.bg-primary]:bg-yellow-400 [&_.bg-secondary]:bg-slate-100"
                                />
                                <p className="text-[10px] text-slate-400">{Math.round(750 * (betDistribution[0] / 100))} bets: P5, P10, P15, P20...</p>
                            </div>

                            <div className="space-y-1 border-t pt-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Specific amounts</span>
                                    <span className="font-black text-slate-800">{100 - betDistribution[0]}%</span>
                                </div>
                                <p className="text-[10px] text-slate-400">{Math.round(750 * ((100 - betDistribution[0]) / 100))} bets: P7, P13, P34, P143...</p>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-xl border border-yellow-200 bg-yellow-50/40 p-4 flex flex-wrap gap-6 text-sm">
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-bold">Booklets</span>
                            <div className="font-black text-slate-800 text-lg">{bookletCount}</div>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-bold">Revenue Target</span>
                            <div className="font-black text-blue-600 text-lg">₱{dailyRevenue.toLocaleString()}</div>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-bold">Payout Target</span>
                            <div className="font-black text-red-500 text-lg">₱{totalPayout.toLocaleString()}</div>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-bold">Net</span>
                            <div className="font-black text-green-600 text-lg">₱{(dailyRevenue - totalPayout).toLocaleString()}</div>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-bold">Serials</span>
                            <div className="font-black text-slate-800 text-lg font-mono">{serialStart} – {serialEnd}</div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                        size="lg"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full h-14 bg-yellow-300 hover:bg-yellow-400 text-yellow-900 border border-yellow-400 font-bold tracking-widest text-sm shadow-[0_4px_14px_0_rgba(250,204,21,0.39)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                GENERATING {bookletCount} BOOKLET{bookletCount !== 1 ? "S" : ""}…
                            </>
                        ) : (
                            <>
                                <Copy className="mr-2 h-4 w-4" />
                                GENERATE {bookletCount} BOOKLET{bookletCount !== 1 ? "S" : ""}
                            </>
                        )}
                    </Button>

                </CardContent>
            </Card>
        </div>
    );
};

export default Index;
