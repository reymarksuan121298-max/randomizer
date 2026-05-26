import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, ClipboardList, FileText, Loader2, Settings, Ticket } from "lucide-react";
import { toast } from "sonner";
import { generateBookletBatch } from "@/utils/lotteryGenerator";
import { getGameTypes } from "@/data/gameTypes";
import type { WinningNumbers } from "@/types/lottery";
import type { Batch } from "@/types/lottery";
import { databaseEnabled, saveGeneratedBatchToDatabase, getCompanySettings } from "@/lib/database";
import { useAuth } from "@/contexts/AuthContext";


const BATCHES_KEY = "batches";



const Index = () => {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const winningInputs = useRef<Record<string, HTMLInputElement | null>>({});

    const [betDistribution, setBetDistribution] = useState([80]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [company, setCompany] = useState("");
    const [logos, setLogos] = useState<Record<string, any>>({});
    const [companyCode, setCompanyCode] = useState("STL");
    const [dailyRevenue, setDailyRevenue] = useState(80000);
    const [totalPayout, setTotalPayout] = useState(50000);
    const [bookletCount, setBookletCount] = useState(1);
    const [minBet, setMinBet] = useState(5);
    const [maxBet, setMaxBet] = useState(150);
    const [serialStarts, setSerialStarts] = useState<string[]>(["1000001"]);
    const [disableLocal, setDisableLocal] = useState(false);
    const getLocalDate = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [selectedDate, setSelectedDate] = useState(getLocalDate);

    useEffect(() => {
        setSerialStarts((prev) => {
            const next = [...prev];
            while (next.length < bookletCount) {
                const prevStart = parseInt(next[next.length - 1] || "1000001") || 1000001;
                next.push((prevStart + 250).toString());
            }
            return next;
        });
    }, [bookletCount]);

    const handleMainSerialStartChange = (value: string) => {
        const startNum = parseInt(value) || 0;
        setSerialStarts((prev) => prev.map((_, i) => (startNum + i * 250).toString()));
    };

    const handleBookletSerialChange = (index: number, value: string) => {
        setSerialStarts((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    useEffect(() => {
        if (profile?.company?.name) {
            setCompany(profile.company.name);
        } else if (user?.user_metadata?.company) {
            setCompany(user.user_metadata.company);
        }
        if (profile?.company?.code) {
            setCompanyCode(profile.company.code);
        } else if (user?.user_metadata?.company_code) {
            setCompanyCode(user.user_metadata.company_code);
        }
    }, [profile, user]);

    useEffect(() => {
        const loadLogos = async () => {
            if (!profile?.company?.id) return;
            try {
                const settings = await getCompanySettings(Number(profile.company.id));
                if (settings?.logos) {
                    setLogos(settings.logos);
                }
            } catch (error) {
                console.error("Failed to load company logos:", error);
            }
        };
        loadLogos();
    }, [profile?.company?.id]);

    const formattedDate = new Date(selectedDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const activeGameTypes = getGameTypes(company);

    const buildWinningNumbers = () => {
        const winningNumbers: WinningNumbers = {};

        activeGameTypes.forEach((gt) => {
            const input = winningInputs.current[gt.id];
            if (input?.value.trim()) {
                winningNumbers[gt.id] = input.value.trim();
            }
        });

        return winningNumbers;
    };

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
            const winningNumbers = buildWinningNumbers();
            const serialRanges = Array.from({ length: bookletCount }, (_, i) => {
                const bookletStart = parseInt(serialStarts[i] || "1000001") || 1000001;
                return {
                    start: bookletStart.toString(),
                    end: (bookletStart + 249).toString(),
                };
            });

            await new Promise((resolve) => setTimeout(resolve, 50));

            const batchData = generateBookletBatch(
                company,
                dailyRevenue,
                bookletCount,
                minBet,
                maxBet,
                betDistribution[0],
                serialRanges,
                disableLocal ? activeGameTypes.filter(g => g.isNational) : activeGameTypes,
                totalPayout,
                winningNumbers,
                companyCode,
                undefined,
                selectedDate
            );
            (batchData as any).winningNumbers = winningNumbers;

            const code = companyCode.toUpperCase().slice(0, 3);
            const dateStr = selectedDate.replace(/-/g, "");
            const rand = Math.floor(Math.random() * 900000000 + 100000000);
            const batchId = `${code}-${dateStr}-${rand}`;

            batchData.id = batchId;
            batchData.name = `${company} - ${new Date(selectedDate).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`;

            const newBatch: Batch = {
                id: batchId,
                name: batchData.name,
                province: company,
                date: selectedDate,
                booklets: bookletCount,
                revenue: `PHP ${dailyRevenue.toLocaleString()}`,
                createdAt: new Date().toISOString(),
                createdBy: user?.email || user?.user_metadata?.full_name || "Authenticated user",
                status: "generated",
                total_revenue: batchData.grandTotalBets,
                total_payout: batchData.totalPayout,
            };

            const existingRaw = localStorage.getItem(BATCHES_KEY);
            const existing: Batch[] = existingRaw ? JSON.parse(existingRaw) : [];
            localStorage.setItem(BATCHES_KEY, JSON.stringify([newBatch, ...existing]));
            localStorage.setItem(`batch_data_${batchId}`, JSON.stringify(batchData));

            if (databaseEnabled()) {
                await saveGeneratedBatchToDatabase(newBatch, batchData, {
                    companyName: company,
                    companyCode,
                    gameTypes: activeGameTypes,
                });
            }

            toast.success(
                `Generated ${bookletCount} booklet${bookletCount > 1 ? "s" : ""} successfully${databaseEnabled() ? " and saved to database" : ""}!`
            );
            navigate(`/batch/${batchId}`);
        } catch (err) {
            console.error(err);
            toast.error("Generation failed or database save was rejected. Check console for details.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#f7f8fa] px-3 py-4 text-slate-900">
            <div className="mx-auto max-w-[650px]">
                <header className="mb-4 text-center">
                    <div className="mb-1 flex items-center justify-center gap-3">
                        {logos?.leftLogo ? (
                            <img src={logos.leftLogo} alt="Company Logo" className="h-12 w-12 object-contain rounded-md" />
                        ) : (
                            <div className="relative h-12 w-12 rounded-full bg-[conic-gradient(from_15deg,#fbbf24_0_16%,#dc2626_16%_31%,#1d4ed8_31%_52%,#f8fafc_52%_62%,#1d4ed8_62%_76%,#fbbf24_76%_88%,#dc2626_88%_100%)] shadow-sm">
                                <div className="absolute inset-2 rounded-full bg-white/85" />
                                <div className="absolute inset-4 rounded-full bg-[#1d4ed8]" />
                            </div>
                        )}
                        <h1 className="text-[27px] font-black uppercase leading-none tracking-wide text-[#f6b719]">
                            STL Ticket System
                        </h1>
                        {logos?.rightLogo ? (
                            <img src={logos.rightLogo} alt="STL Logo" className="h-12 w-12 object-contain rounded-md" />
                        ) : (
                            <div className="relative h-12 w-11">
                                <div className="absolute left-1 top-0 h-9 w-8 rounded-sm border-l-[7px] border-t-[7px] border-[#1d4ed8]" />
                                <div className="absolute bottom-1 left-2 h-2 w-8 bg-[#f6b719]" />
                                <div className="absolute bottom-0 right-0 h-8 w-7 border-b-[7px] border-r-[7px] border-[#dc2626]" />
                            </div>
                        )}
                    </div>

                    <div className="mb-3 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500">
                        <Calendar className="h-3 w-3" />
                        <span>{formattedDate}</span>
                    </div>

                    <div className="mb-2 grid grid-cols-3 gap-2">
                        <Button
                            variant="outline"
                            className="h-7 gap-1 border-[#f6b719] px-1 text-[8px] font-bold uppercase text-[#d89a00]"
                            onClick={() => navigate("/company-settings")}
                        >
                            <Settings className="h-3 w-3" />
                            Company Settings
                        </Button>
                        <Button
                            variant="outline"
                            className="h-7 gap-1 border-[#f6b719] px-1 text-[8px] font-bold uppercase text-[#d89a00]"
                            onClick={() => navigate("/batches")}
                        >
                            <ClipboardList className="h-3 w-3" />
                            View Saved Batches
                        </Button>
                        <Button
                            variant="outline"
                            className="h-7 gap-1 border-[#f6b719] px-1 text-[8px] font-bold uppercase text-[#d89a00]"
                            onClick={() => navigate("/prize-utilization")}
                        >
                            <FileText className="h-3 w-3" />
                            Prize Utilization
                        </Button>
                    </div>

                    <p className="flex items-center justify-center gap-1 text-[10px] text-slate-500">
                        <Ticket className="h-3 w-3" />
                        50 Sheets per Booklet (11-{companyCode}-001 to 11-{companyCode}-050) - 250 Tickets Total
                    </p>
                </header>

                <Card className="rounded-md border-slate-200 bg-white shadow-sm">
                    <CardContent className="space-y-4 p-4">
                        <h2 className="text-center text-[13px] font-black uppercase tracking-wide">Generate Booklets</h2>

                        <section className="grid grid-cols-2 gap-x-3 gap-y-3">
                            <div className="col-span-2">
                                <Field label="Company" helper="Your assigned company and province">
                                    <Input value={company} readOnly className="h-8 text-[10px] bg-slate-50 cursor-not-allowed text-slate-600 font-semibold" />
                                </Field>
                            </div>
                            <Field label="Batch Date" helper="Date for the generated batch">
                                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-8 text-[10px] font-mono text-slate-700" />
                            </Field>
                            <Field label="Daily Revenue (PHP)" helper="Total revenue across all booklets">
                                <Input type="number" value={dailyRevenue} onChange={(e) => setDailyRevenue(parseInt(e.target.value) || 0)} className="h-8 text-[10px]" />
                            </Field>
                            <Field label="Total Payout (PHP)" helper="Total payout for winners">
                                <Input type="number" value={totalPayout} onChange={(e) => setTotalPayout(parseInt(e.target.value) || 0)} className="h-8 text-[10px]" />
                            </Field>
                            <Field label="Number of Booklets" helper="How many booklets per day">
                                <Input type="number" min={1} value={bookletCount} onChange={(e) => setBookletCount(parseInt(e.target.value) || 1)} className="h-8 text-[10px]" />
                            </Field>
                            <Field label="Minimum Bet (PHP)" helper="Minimum bet per number">
                                <Input type="number" value={minBet} onChange={(e) => setMinBet(parseInt(e.target.value) || 5)} className="h-8 text-[10px]" />
                            </Field>
                            <Field label="Maximum Bet (PHP)" helper="Maximum bet per number">
                                <Input type="number" value={maxBet} onChange={(e) => setMaxBet(parseInt(e.target.value) || 150)} className="h-8 text-[10px]" />
                            </Field>
                        </section>

                        <Panel>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 fill-[#f6b719] text-[#f6b719]" />
                                <div>
                                    <h3 className="text-[10px] font-black uppercase">Per-Draw Revenue Distribution</h3>
                                    <p className="mt-1 text-[9px] text-slate-500">Control what percentage of total revenue goes to each draw time</p>
                                </div>
                            </div>
                        </Panel>

                        <Panel>
                            <h3 className="mb-3 text-[10px] font-black uppercase">Payout Multipliers (From Game Types)</h3>
                            <div className="grid grid-cols-4 gap-x-3 gap-y-2">
                                {activeGameTypes.map((gt) => (
                                    <div key={gt.id} className="flex justify-between gap-1 text-[9px]">
                                        <span className="truncate text-slate-500">{gt.name}</span>
                                        <strong>{gt.multiplier}x</strong>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-2 text-[9px] text-slate-500">Each game type has its own multiplier. Payout = bet x multiplier</p>
                        </Panel>

                        <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-[10px] font-black uppercase">Winning Numbers (Optional)</h3>
                                    <p className="mt-1 text-[9px] text-slate-500">Enter winning numbers if you want to allocate a specific total payout</p>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm">
                                    <input 
                                        type="checkbox" 
                                        id="disable-local"
                                        checked={disableLocal}
                                        onChange={(e) => setDisableLocal(e.target.checked)}
                                        className="h-3 w-3 accent-[#f6b719]"
                                    />
                                    <Label htmlFor="disable-local" className="text-[9px] font-bold text-slate-600 cursor-pointer">Disable Local</Label>
                                </div>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {activeGameTypes.map((gt) => {
                                    const isLocal = !gt.isNational;
                                    const isDisabled = disableLocal && isLocal;
                                    const placeholder = gt.digits === 3 ? "000-999" : "00-99";
                                    return (
                                        <div key={gt.id} className={`space-y-1 ${isDisabled ? 'opacity-40 grayscale' : ''}`}>
                                            <div className="flex items-center gap-1">
                                                <Label className="truncate text-[8px] font-black">{gt.name}</Label>
                                                <Badge className={`h-3 rounded-[3px] px-1 text-[6px] ${isLocal ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {isLocal ? "Local" : "National"}
                                                </Badge>
                                            </div>
                                            <Input
                                                ref={(el) => {
                                                    winningInputs.current[gt.id] = el;
                                                }}
                                                placeholder={placeholder}
                                                className="h-7 text-center text-[9px]"
                                                disabled={isDisabled}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase">Serial Number Ranges (250 per Booklet)</h3>
                            {Array.from({ length: bookletCount }).map((_, i) => {
                                const startNum = parseInt(serialStarts[i] || "1000001") || 1000001;
                                const endNum = startNum + 249;
                                return (
                                    <Panel key={i}>
                                        <h4 className="mb-2 text-[9px] font-black uppercase text-[#f6b719]">Booklet {i + 1}</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Field label="Serial Start" helper="Range: 250 serials">
                                                <Input 
                                                    value={serialStarts[i] || ""} 
                                                    onChange={(e) => {
                                                        if (i === 0) {
                                                            handleMainSerialStartChange(e.target.value);
                                                        } else {
                                                            handleBookletSerialChange(i, e.target.value);
                                                        }
                                                    }} 
                                                    className="h-8 text-[10px]" 
                                                />
                                            </Field>
                                            <Field label="Serial End" helper="&nbsp;">
                                                <Input 
                                                    value={endNum.toString()} 
                                                    readOnly 
                                                    className="h-8 text-[10px]" 
                                                />
                                            </Field>
                                        </div>
                                    </Panel>
                                );
                            })}
                        </section>

                        <Panel>
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase">Bet Distribution</h3>
                                <button className="text-[8px] font-semibold text-slate-500" onClick={() => setBetDistribution([80])}>
                                    Reset to 80/20
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px]">
                                        <span>Multiples of 5</span>
                                        <strong className="text-[#f6b719]">{betDistribution[0]}%</strong>
                                    </div>
                                    <Slider
                                        value={betDistribution}
                                        onValueChange={setBetDistribution}
                                        max={100}
                                        step={1}
                                        className="[&_[role=slider]]:border-2 [&_[role=slider]]:border-[#f6b719] [&_[role=slider]]:bg-white [&_.bg-primary]:bg-[#f6b719]"
                                    />
                                    <p className="text-[8px] text-slate-500">600 bets: P5, P10, P15, P20...</p>
                                </div>
                                <div className="border-t pt-2">
                                    <div className="flex justify-between text-[10px]">
                                        <span>Specific amounts</span>
                                        <strong>{100 - betDistribution[0]}%</strong>
                                    </div>
                                    <p className="mt-1 text-[8px] text-slate-500">150 bets: P7, P13, P34, P143...</p>
                                </div>
                            </div>
                        </Panel>

                        <Button
                            size="lg"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="h-9 w-full rounded-md bg-[#f6c65b] text-[10px] font-black uppercase tracking-wide text-[#9a6b00] hover:bg-[#f3bc42]"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Generating {bookletCount} Booklet
                                </>
                            ) : (
                                <>
                                    <Ticket className="h-3 w-3" />
                                    Generate {bookletCount} Booklet
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
};

const Panel = ({ children }: { children: React.ReactNode }) => (
    <section className="rounded-md border border-slate-200 bg-slate-50/50 p-3">{children}</section>
);

const Field = ({ label, helper, children }: { label: string; helper: string; children: React.ReactNode }) => (
    <div className="min-w-0 space-y-1">
        <Label className="block truncate text-[9px] font-black uppercase tracking-tight">{label}</Label>
        {children}
        <p className="truncate text-[8px] text-slate-500">{helper}</p>
    </div>
);

export default Index;
