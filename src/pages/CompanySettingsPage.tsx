import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Settings } from "lucide-react";

export const CompanySettingsPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 font-sans text-slate-800">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-start gap-4 mb-10">
                    <Button variant="outline" size="sm" onClick={() => navigate('/')} className="h-8 gap-1 font-bold text-xs shrink-0 mt-1">
                        <ArrowLeft className="h-3 w-3" /> BACK
                    </Button>
                    <div className="flex-1 flex flex-col items-center">
                        <h1 className="text-3xl font-black text-yellow-400 uppercase tracking-tight mb-2">Company Settings</h1>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Manage your company information, logos, and report configurations</p>
                    </div>
                </div>

                {/* Company Info Box */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                            <Building2 className="h-6 w-6 text-yellow-500" />
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Cotabato City - Imperial</h2>
                        </div>
                        <p className="text-xs text-slate-500">Cotabato City, Cotabato City</p>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-y-8">
                        <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Company Code</div>
                            <div className="text-sm font-black text-slate-800 uppercase">COT</div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Status</div>
                            <div className="text-sm font-black text-green-600 bg-green-50 inline-block px-2 py-0.5 rounded uppercase">Active</div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Report Frequency</div>
                            <div className="text-sm font-black text-slate-800 uppercase">Daily</div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-3">Logos</div>
                            <div className="w-12 h-12 flex flex-col items-center justify-center font-black text-xl border-4 border-slate-800 rounded relative overflow-hidden bg-white">
                                <div className="text-blue-600 absolute top-0 left-1 leading-none">C</div>
                                <div className="text-red-600 absolute bottom-0 right-1 leading-none">T</div>
                                <div className="w-full h-1 bg-yellow-400 absolute top-1/2 -translate-y-1/2"></div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-start">
                        <Button className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border border-yellow-500 font-bold text-xs uppercase gap-2 h-10 px-6">
                            <Settings className="h-4 w-4" /> Edit Company Settings
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanySettingsPage;
