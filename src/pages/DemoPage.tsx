import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

import { Play, Sparkles, Zap, ShieldCheck } from "lucide-react";

const DemoPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white flex flex-col items-center justify-center p-6">
            <div className="max-w-4xl w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
                <div className="inline-block p-3 bg-white/10 rounded-2xl backdrop-blur-xl border border-white/20 mb-4">
                    <Sparkles className="h-12 w-12 text-yellow-400" />
                </div>

                <h1 className="text-6xl font-extrabold tracking-tight">
                    Lottery <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Master</span>
                </h1>

                <p className="text-xl text-indigo-100 max-w-2xl mx-auto leading-relaxed">
                    The next generation of lottery generation and management.
                    Precision-engineered algorithms for revenue balance and compliant payout allocation.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12">
                    <div className="p-6 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                        <Zap className="h-8 w-8 text-yellow-500 mb-4 mx-auto" />
                        <h3 className="font-bold text-lg">Instant Generation</h3>
                        <p className="text-sm text-indigo-200 mt-2">Generate 10,000+ tickets in milliseconds with exact revenue targets.</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                        <ShieldCheck className="h-8 w-8 text-green-400 mb-4 mx-auto" />
                        <h3 className="font-bold text-lg">Strict Compliance</h3>
                        <p className="text-sm text-indigo-200 mt-2">Automatic enforcement of payout caps and legal constraints.</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                        <Sparkles className="h-8 w-8 text-purple-400 mb-4 mx-auto" />
                        <h3 className="font-bold text-lg">Beautiful Reports</h3>
                        <p className="text-sm text-indigo-200 mt-2">Export professional-grade Excel, DSR, and SOD documents instantly.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                        size="lg"
                        className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white border-none h-14 px-10 text-lg font-bold shadow-xl hover:scale-105 transition-all"
                        onClick={() => navigate('/login')}
                    >
                        <Play className="mr-2 h-5 w-5 fill-current" /> Start Discovery
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        className="border-white/20 bg-white/5 hover:bg-white/10 text-white h-14 px-10 text-lg"
                        onClick={() => navigate('/demo/visayas')}
                    >
                        View Visayas Mock
                    </Button>
                </div>

                <div className="pt-20 text-indigo-300/50 text-sm">
                    © 2026 Alpha Digital Solutions. For internal use only.
                </div>
            </div>
        </div>
    );
};

export default DemoPage;
