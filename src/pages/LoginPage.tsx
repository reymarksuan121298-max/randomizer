import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn, Moon } from "lucide-react";
import { getDefaultLogosFromDatabase } from "@/lib/database";
import defaultLeftLogo from "@/assets/left-logo.png";
import defaultRightLogo from "@/assets/right-logo.png";

export const LoginPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [logos, setLogos] = useState<{ leftLogo?: string | null; rightLogo?: string | null }>({
        leftLogo: defaultLeftLogo,
        rightLogo: defaultRightLogo
    });
    const { login, user, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const loadLogos = async () => {
            const defaultLogos = await getDefaultLogosFromDatabase();
            setLogos(defaultLogos);
        };
        loadLogos();
    }, []);

    useEffect(() => {
        if (user && !isLoading) {
            navigate("/");
        }
    }, [user, isLoading, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await login({ email, password });
            toast.success("Logged in successfully");
            navigate("/");
        } catch {
            toast.error("Failed to login");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#f7f8fa] text-slate-950">
            <Button
                variant="outline"
                size="icon"
                className="absolute right-5 top-5 z-20 h-11 w-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-sm"
                onClick={() => document.documentElement.classList.toggle("dark")}
                aria-label="Toggle theme"
            >
                <Moon className="h-5 w-5" />
            </Button>

            <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
                <section className="relative hidden min-h-screen items-center justify-center overflow-hidden bg-[#fff7d8] lg:flex">
                    <div className="relative z-10 flex w-full max-w-[640px] flex-col items-center text-center">
                        {logos.rightLogo ? (
                            <img src={logos.rightLogo} alt="STL Logo" className="mb-7 h-36 w-36 object-contain" />
                        ) : (
                            <LogoMark className="mb-7 h-36 w-36" />
                        )}
                        <p className="mb-5 text-4xl font-black uppercase tracking-wide text-[#f7b500]">Welcome To</p>
                        <h1 className="mb-7 text-5xl font-black uppercase tracking-wide text-slate-950">STL Ticket System</h1>
                        <p className="max-w-[520px] text-2xl leading-snug text-slate-600">
                            Manage your lottery booklets, batches, and companies with ease
                        </p>
                    </div>
                </section>

                <section className="flex min-h-screen items-center justify-center px-5 py-16 lg:px-12">
                    <div className="w-full max-w-[505px]">
                        <div className="mb-10 text-center">
                            {logos.leftLogo ? (
                                <img src={logos.leftLogo} alt="Company Logo" className="mx-auto mb-6 h-14 w-14 object-contain" />
                            ) : (
                                <LogoSwirl className="mx-auto mb-6 h-14 w-14" />
                            )}
                            <h2 className="mb-4 text-3xl font-black uppercase tracking-wide text-[#f7b500]">Sign In</h2>
                            <p className="text-xl text-slate-600">Enter your credentials to continue</p>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="rounded-xl border border-slate-200 bg-white p-9 shadow-[0_14px_28px_rgba(15,23,42,0.12)]"
                        >
                            <div className="space-y-7">
                                <div className="space-y-3">
                                    <Label htmlFor="email" className="text-xs font-black uppercase tracking-tight text-slate-950">
                                        Email Address
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="lanaonorte.manager@glowingfortune.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-14 rounded-xl border-slate-200 bg-slate-50 px-4 font-mono text-base text-slate-950 shadow-inner placeholder:text-slate-500"
                                        required
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="password" className="text-xs font-black uppercase tracking-tight text-slate-950">
                                        Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="h-14 rounded-xl border-slate-200 bg-slate-50 px-4 pr-12 font-mono text-base text-slate-950 shadow-inner"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-transparent p-0 text-slate-500 hover:text-slate-900"
                                            onClick={() => setShowPassword((value) => !value)}
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="h-14 w-full rounded-xl bg-[#f7a900] text-sm font-black uppercase tracking-wide text-slate-950 shadow-none hover:bg-[#ed9f00]"
                                    disabled={isSubmitting}
                                >
                                    <LogIn className="h-5 w-5" />
                                    {isSubmitting ? "Signing In" : "Sign In"}
                                </Button>
                            </div>
                        </form>

                        <p className="mt-10 text-center text-base text-slate-600">
                            Powered by <span className="font-black text-slate-950">RKD Tech Solutions Inc.</span>
                        </p>
                    </div>
                </section>
            </div>
        </main>
    );
};

const LogoMark = ({ className = "" }: { className?: string }) => (
    <div className={`relative ${className}`}>
        <div className="absolute left-[16%] top-[10%] h-[58%] w-[62%] rounded-md border-l-[22px] border-t-[22px] border-[#0046b8]" />
        <div className="absolute left-[38%] top-[39%] h-[16%] w-[42%] rounded-md bg-[#f7b500]" />
        <div className="absolute bottom-[12%] left-[17%] h-[18%] w-[62%] rounded-md bg-[#d30c22]" />
        <div className="absolute bottom-[13%] left-[50%] h-[53%] w-[14%] bg-[#d30c22]" />
        <div className="absolute right-[15%] top-[38%] h-[34%] w-[17%] rounded-r-md bg-[#f7b500]" />
    </div>
);

const LogoSwirl = ({ className = "" }: { className?: string }) => (
    <div className={`relative rounded-full bg-white shadow-sm ${className}`}>
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_12deg,#f7b500_0_16%,#d30c22_16%_31%,#0046b8_31%_53%,#ffffff_53%_62%,#0046b8_62%_76%,#f7b500_76%_88%,#d30c22_88%_100%)]" />
        <div className="absolute inset-[18%] rounded-full bg-white/85" />
        <div className="absolute inset-[35%] rounded-full bg-[#0046b8]" />
    </div>
);
