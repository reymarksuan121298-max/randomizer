import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, ClipboardList, FileText, KeyRound, Loader2, LogOut, Settings, Ticket, UserRound } from "lucide-react";
import { toast } from "sonner";
import { generateBookletBatch } from "@/utils/lotteryGenerator";
import { gameTypes } from "@/data/gameTypes";
import type { WinningNumbers } from "@/types/lottery";
import type { Batch } from "./BatchesPage";
import { databaseEnabled, saveGeneratedBatchToDatabase } from "@/lib/database";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";

const BATCHES_KEY = "batches";

const drawCards = [
    { id: "local-1030", label: "Swer3 10:30 AM", badge: "Local", placeholder: "000-999", gameTypeName: "Local 3D", time: "10:30 AM" },
    { id: "3d-1400", label: "3D 2:00 PM", badge: "National", placeholder: "000-999", gameTypeName: "3D", time: "2:00 PM" },
    { id: "local-1500", label: "Swer3 3:00 PM", badge: "Local", placeholder: "000-999", gameTypeName: "Local 3D", time: "3:00 PM" },
    { id: "3d-1700", label: "3D 5:00 PM", badge: "National", placeholder: "000-999", gameTypeName: "3D", time: "5:00 PM" },
    { id: "local-1900", label: "Swer3 7:00 PM", badge: "Local", placeholder: "000-999", gameTypeName: "Local 3D", time: "7:00 PM" },
    { id: "3d-2100", label: "3D 9:00 PM", badge: "National", placeholder: "000-999", gameTypeName: "3D", time: "9:00 PM" },
];

const multiplierRows = [
    ["Swer3 10:30 AM", "550x"],
    ["3D 2:00 PM", "500x"],
    ["Swer3 3:00 PM", "550x"],
    ["3D 5:00 PM", "500x"],
    ["Swer3 7:00 PM", "550x"],
    ["3D 9:00 PM", "500x"],
];

const Index = () => {
    const navigate = useNavigate();
    const { user, profile, logout } = useAuth();
    const winningInputs = useRef<Record<string, HTMLInputElement | null>>({});

    const [betDistribution, setBetDistribution] = useState([80]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [company, setCompany] = useState("");
    const [companyCode, setCompanyCode] = useState("STL");
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const [dailyRevenue, setDailyRevenue] = useState(80000);
    const [totalPayout, setTotalPayout] = useState(50000);
    const [bookletCount, setBookletCount] = useState(1);
    const [minBet, setMinBet] = useState(5);
    const [maxBet, setMaxBet] = useState(150);
    const [serialStart, setSerialStart] = useState("1000001");

    const serialEnd = useMemo(() => {
        const start = parseInt(serialStart) || 1000001;
        return (start + bookletCount * 250 - 1).toString();
    }, [bookletCount, serialStart]);

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

    const todayDate = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const buildWinningNumbers = () => {
        const winningNumbers: WinningNumbers = {};

        gameTypes.forEach((gt) => {
            const matchingDraw = drawCards.find((draw) => {
                const byName = gt.name.toLowerCase().includes(draw.gameTypeName.toLowerCase());
                const byTime = !gt.time || gt.time === draw.time;
                return byName && byTime;
            });

            const input = matchingDraw ? winningInputs.current[matchingDraw.id] : winningInputs.current[gt.id];
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
            const startNum = parseInt(serialStart) || 1000001;
            const serialRanges = Array.from({ length: bookletCount }, (_, i) => {
                const bookletStart = startNum + i * 250;
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
                gameTypes,
                totalPayout,
                winningNumbers,
                companyCode
            );
            (batchData as any).winningNumbers = winningNumbers;

            const code = companyCode.toUpperCase().slice(0, 3);
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            const rand = Math.floor(Math.random() * 900000000 + 100000000);
            const batchId = `${code}-${dateStr}-${rand}`;

            batchData.id = batchId;
            batchData.name = `${company} - ${new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`;

            const newBatch: Batch = {
                id: batchId,
                name: batchData.name,
                province: company,
                date: new Date().toISOString().slice(0, 10),
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
                    gameTypes,
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
            <div className="absolute right-4 top-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className="h-10 gap-2 rounded-lg border-2 border-[#f6b719] bg-white px-4 text-xs font-bold text-slate-900 shadow-sm"
                        >
                            <UserRound className="h-4 w-4 text-[#f6b719]" />
                            {profile?.fullName || user?.user_metadata?.full_name || user?.email || "Account"}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 rounded-lg border-slate-200 bg-white p-4 text-slate-950 shadow-xl">
                        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
                            <UserRound className="mt-1 h-5 w-5 text-[#f6b719]" />
                            <div className="min-w-0">
                                <div className="truncate text-sm font-black">{profile?.fullName || user?.user_metadata?.full_name || user?.email}</div>
                                <div className="truncate text-xs text-slate-500">{user?.email}</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {(profile?.role || user?.user_metadata?.role) && (
                                        <span className="rounded bg-[#fff2bf] px-2 py-1 text-[10px] font-black uppercase text-[#d99a00]">
                                            {profile?.role || user?.user_metadata?.role}
                                        </span>
                                    )}
                                    {(profile?.company?.name || user?.user_metadata?.company) && (
                                        <span className="rounded bg-[#fff2bf] px-2 py-1 text-[10px] font-mono text-[#d99a00]">
                                            {profile?.company?.name || user?.user_metadata?.company}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <DropdownMenuItem className="mt-2 gap-2 rounded-md py-3 text-sm" onClick={() => setIsPasswordOpen(true)}>
                            <KeyRound className="h-4 w-4" />
                            Change Password
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="gap-2 rounded-md py-3 text-sm"
                            onClick={async () => {
                                await logout();
                                navigate("/login");
                            }}
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <ChangePasswordDialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen} />
            <div className="mx-auto max-w-[380px]">
                <header className="mb-4 text-center">
                    <div className="mb-1 flex items-center justify-center gap-3">
                        <div className="relative h-12 w-12 rounded-full bg-[conic-gradient(from_15deg,#fbbf24_0_16%,#dc2626_16%_31%,#1d4ed8_31%_52%,#f8fafc_52%_62%,#1d4ed8_62%_76%,#fbbf24_76%_88%,#dc2626_88%_100%)] shadow-sm">
                            <div className="absolute inset-2 rounded-full bg-white/85" />
                            <div className="absolute inset-4 rounded-full bg-[#1d4ed8]" />
                        </div>
                        <h1 className="text-[27px] font-black uppercase leading-none tracking-wide text-[#f6b719]">
                            STL Ticket System
                        </h1>
                        <div className="relative h-12 w-11">
                            <div className="absolute left-1 top-0 h-9 w-8 rounded-sm border-l-[7px] border-t-[7px] border-[#1d4ed8]" />
                            <div className="absolute bottom-1 left-2 h-2 w-8 bg-[#f6b719]" />
                            <div className="absolute bottom-0 right-0 h-8 w-7 border-b-[7px] border-r-[7px] border-[#dc2626]" />
                        </div>
                    </div>

                    <p className="mb-3 flex items-center justify-center gap-1 text-[10px] text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {todayDate}
                    </p>

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
                            <Field label="Company" helper="Your assigned company and province">
                                <Input value={company} onChange={(e) => setCompany(e.target.value)} className="h-8 text-[10px]" />
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
                            <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                                {multiplierRows.map(([label, multiplier]) => (
                                    <div key={label} className="flex justify-between gap-1 text-[9px]">
                                        <span className="truncate text-slate-500">{label}</span>
                                        <strong>{multiplier}</strong>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-2 text-[9px] text-slate-500">Each game type has its own multiplier. Payout = bet x multiplier</p>
                        </Panel>

                        <section className="rounded-md border border-[#f6b719] bg-[#fffaf0] p-3">
                            <h3 className="text-[10px] font-black uppercase">Winning Numbers (Optional)</h3>
                            <p className="mt-1 text-[9px] text-slate-500">Enter winning numbers if you want to allocate a specific total payout</p>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {drawCards.map((draw) => (
                                    <div key={draw.id} className="space-y-1">
                                        <div className="flex items-center gap-1">
                                            <Label className="truncate text-[8px] font-black">{draw.label}</Label>
                                            <Badge className="h-3 rounded-[3px] bg-green-100 px-1 text-[6px] text-green-700 hover:bg-green-100">
                                                {draw.badge}
                                            </Badge>
                                        </div>
                                        <Input
                                            ref={(el) => {
                                                winningInputs.current[draw.id] = el;
                                            }}
                                            placeholder={draw.placeholder}
                                            className="h-7 text-center text-[9px]"
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h3 className="mb-2 text-[10px] font-black uppercase">Serial Number Ranges (250 per Booklet)</h3>
                            <Panel>
                                <h4 className="mb-2 text-[9px] font-black uppercase text-[#f6b719]">Booklet 1</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <Field label="Serial Start" helper={`${bookletCount * 250} serials`}>
                                        <Input value={serialStart} onChange={(e) => setSerialStart(e.target.value)} className="h-8 text-[10px]" />
                                    </Field>
                                    <Field label="Serial End" helper="Auto-calculated">
                                        <Input value={serialEnd} readOnly className="h-8 bg-slate-50 text-[10px]" />
                                    </Field>
                                </div>
                            </Panel>
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
