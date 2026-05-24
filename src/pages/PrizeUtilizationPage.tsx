import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, FileSpreadsheet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const PrizeUtilizationPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 font-sans text-slate-800">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-start gap-4 mb-8">
                    <Button variant="outline" size="sm" onClick={() => navigate('/')} className="h-8 gap-1 font-bold text-xs shrink-0 mt-1">
                        <ArrowLeft className="h-3 w-3" /> BACK
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black text-yellow-400 uppercase tracking-tight mb-2">Prize Fund Utilization Report</h1>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Monthly prize fund analysis and utilization</p>
                    </div>
                </div>

                {/* Selection Box */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5 text-slate-700" />
                        <h2 className="text-lg font-black uppercase tracking-tight text-slate-800">Select Report Period</h2>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mb-6">Choose the year and month to generate the prize utilization report</p>

                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-700">Year</Label>
                            <Select defaultValue="2026">
                                <SelectTrigger className="bg-white border-slate-200 h-10 font-medium text-sm">
                                    <SelectValue placeholder="Select Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2026">2026</SelectItem>
                                    <SelectItem value="2025">2025</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 w-full space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-700">Month</Label>
                            <Select defaultValue="March">
                                <SelectTrigger className="bg-white border-slate-200 h-10 font-medium text-sm">
                                    <SelectValue placeholder="Select Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="March">March</SelectItem>
                                    <SelectItem value="February">February</SelectItem>
                                    <SelectItem value="January">January</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="flex-1 w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wide">
                            Generate Preview
                        </Button>
                    </div>
                </div>

                {/* Empty State Box */}
                <div className="bg-slate-100/50 rounded-xl border border-dashed border-slate-300 p-20 flex flex-col items-center justify-center text-center">
                    <FileSpreadsheet className="h-16 w-16 text-slate-300 mb-4" strokeWidth={1.5} />
                    <p className="text-slate-500 font-medium text-sm">Select a period and click "Generate Preview" to view the report</p>
                </div>
            </div>
        </div>
    );
};

export default PrizeUtilizationPage;
