import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileSpreadsheet, FileText, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { listBatchesFromDatabase } from "@/lib/database";
import type { Batch } from "@/types/lottery";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const YEARS = ["2024", "2025", "2026", "2027"];

export const PrizeUtilizationPage = () => {
    const navigate = useNavigate();
    const { profile, user } = useAuth();
    
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
    const [previewData, setPreviewData] = useState<Batch[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const isAdmin = profile?.role === 'admin' || user?.user_metadata?.role === 'admin';
            const companyId = !isAdmin ? (profile?.company?.id || user?.user_metadata?.company_id) : undefined;
            
            const allBatches = await listBatchesFromDatabase(companyId);
            
            // Filter by year and month
            const filtered = allBatches.filter(b => {
                const date = new Date(b.date);
                const batchYear = date.getFullYear().toString();
                const batchMonth = MONTHS[date.getMonth()];
                return batchYear === selectedYear && batchMonth === selectedMonth && (b.status === 'generated' || b.status === 'approved');
            });
            
            setPreviewData(filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            if (filtered.length === 0) {
                toast.info(`No generated batches found for ${selectedMonth} ${selectedYear}`);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load batches");
        } finally {
            setIsLoading(false);
        }
    };

    const companyName = profile?.company?.name || user?.user_metadata?.company || "All Companies";

    const handleExport = async () => {
        if (!previewData || previewData.length === 0) return;
        
        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Prize Utilization');
            
            sheet.columns = [
                { width: 20 },
                { width: 20 },
                { width: 20 },
                { width: 20 },
                { width: 15 },
                { width: 20 }
            ];
            
            sheet.addRow(["PRIZE FUND UTILIZATION REPORT", "", "", "", "", ""]);
            sheet.mergeCells('A1:F1');
            const titleRow = sheet.getCell('A1');
            titleRow.font = { bold: true, size: 14 };
            titleRow.alignment = { horizontal: 'center' };
            
            sheet.addRow([`${companyName} - ${selectedMonth} ${selectedYear}`, "", "", "", "", ""]);
            sheet.mergeCells('A2:F2');
            sheet.getCell('A2').alignment = { horizontal: 'center' };
            sheet.getCell('A2').font = { bold: true };
            
            sheet.addRow([]);
            
            const header = sheet.addRow(["Date", "Sales", "Prize Fund (33.9%)", "Payouts", "Utilization %", "Balance"]);
            header.font = { bold: true };
            header.eachCell(c => {
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
                c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
            
            let totalSales = 0;
            let totalFund = 0;
            let totalPayouts = 0;

            previewData.forEach(batch => {
                const sales = batch.total_revenue || 0;
                const fund = sales * 0.339;
                const payout = batch.total_payout || 0;
                const util = fund > 0 ? (payout / fund) * 100 : 0;
                const balance = fund - payout;
                
                totalSales += sales;
                totalFund += fund;
                totalPayouts += payout;

                const row = sheet.addRow([
                    formatDate(batch.date),
                    sales,
                    fund,
                    payout,
                    `${util.toFixed(2)}%`,
                    balance
                ]);
                row.getCell(2).numFmt = '₱#,##0.00';
                row.getCell(3).numFmt = '₱#,##0.000';
                row.getCell(4).numFmt = '₱#,##0.00';
                row.getCell(6).numFmt = '₱#,##0.000';
                row.eachCell(c => c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } });
            });
            
            sheet.addRow([]);
            const totalUtil = totalFund > 0 ? (totalPayouts / totalFund) * 100 : 0;
            const summaryRow = sheet.addRow(["TOTALS", totalSales, totalFund, totalPayouts, `${totalUtil.toFixed(2)}%`, totalFund - totalPayouts]);
            summaryRow.font = { bold: true };
            summaryRow.getCell(2).numFmt = '₱#,##0.00';
            summaryRow.getCell(3).numFmt = '₱#,##0.000';
            summaryRow.getCell(4).numFmt = '₱#,##0.00';
            summaryRow.getCell(6).numFmt = '₱#,##0.000';
            
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Prize_Utilization_${selectedMonth}_${selectedYear}.xlsx`);
            toast.success("Report exported to Excel");
        } catch (err) {
            console.error(err);
            toast.error("Failed to export Excel");
        }
    };

    const summary = useMemo(() => {
        if (!previewData) return null;
        let totalSales = 0;
        let totalPayouts = 0;
        
        previewData.forEach(b => {
            totalSales += (b.total_revenue || 0);
            totalPayouts += (b.total_payout || 0);
        });
        
        const prizeFund = totalSales * 0.339;
        const utilization = prizeFund > 0 ? (totalPayouts / prizeFund) * 100 : 0;
        
        return { totalSales, prizeFund, totalPayouts, utilization };
    }, [previewData]);

    const formatCurrency = (val: number) => `₱${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}`;
    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 font-sans text-slate-800">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-start gap-4 mb-8">
                    <Button variant="outline" size="sm" onClick={() => navigate('/batches')} className="h-8 gap-1 font-bold text-xs shrink-0 mt-1 bg-white">
                        <ArrowLeft className="h-3 w-3" /> BACK
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black text-yellow-500 uppercase tracking-tight mb-2">Prize Fund Utilization Report</h1>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Monthly prize fund analysis and utilization</p>
                    </div>
                </div>

                {/* Selection Box */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-slate-700" />
                        <h2 className="text-lg font-black uppercase tracking-tight text-slate-800">Select Report Period</h2>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mb-6">Choose the year and month to generate the prize utilization report</p>

                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-700">Year</Label>
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="bg-white border-slate-200 h-10 font-medium text-sm">
                                    <SelectValue placeholder="Select Year" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {YEARS.map(y => <SelectItem key={y} value={y} className="cursor-pointer font-medium">{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 w-full space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-700">Month</Label>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger className="bg-white border-slate-200 h-10 font-medium text-sm">
                                    <SelectValue placeholder="Select Month" />
                                </SelectTrigger>
                                <SelectContent className="bg-white max-h-[300px]">
                                    {MONTHS.map(m => <SelectItem key={m} value={m} className="cursor-pointer font-medium">{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-1 w-full gap-2">
                            {(!previewData || previewData.length === 0) ? (
                                <Button onClick={handleGenerate} disabled={isLoading} className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wide shadow-sm">
                                    {isLoading ? "Loading..." : "Generate Preview"}
                                </Button>
                            ) : (
                                <>
                                    <Button onClick={handleGenerate} disabled={isLoading} className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wide shadow-sm">
                                        Refresh
                                    </Button>
                                    <Button onClick={handleExport} className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wide gap-2 shadow-sm">
                                        <Download className="h-4 w-4" /> Export to Excel
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {!previewData ? (
                    <div className="bg-slate-100/50 rounded-xl border border-dashed border-slate-300 p-20 flex flex-col items-center justify-center text-center">
                        <FileSpreadsheet className="h-16 w-16 text-slate-300 mb-4" strokeWidth={1.5} />
                        <p className="text-slate-500 font-medium text-sm">Select a period and click "Generate Preview" to view the report</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-12">
                        {/* Preview Header */}
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-5 w-5 text-slate-700" />
                                <h2 className="text-lg font-black uppercase tracking-tight text-slate-800">Preview - {selectedMonth} {selectedYear}</h2>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mb-6">{companyName}</p>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-[#f0f7ff] rounded-xl p-5 border border-blue-100 shadow-sm">
                                    <p className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Total Sales</p>
                                    <p className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(summary!.totalSales)}</p>
                                </div>
                                <div className="bg-[#f0fdf4] rounded-xl p-5 border border-emerald-100 shadow-sm">
                                    <p className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Prize Fund (33.9%)</p>
                                    <p className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(summary!.prizeFund)}</p>
                                </div>
                                <div className="bg-[#fff7ed] rounded-xl p-5 border border-orange-100 shadow-sm">
                                    <p className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Total Payouts</p>
                                    <p className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(summary!.totalPayouts)}</p>
                                </div>
                                <div className="bg-[#fdf4ff] rounded-xl p-5 border border-fuchsia-100 shadow-sm">
                                    <p className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Utilization</p>
                                    <p className="text-3xl font-black text-slate-800 tracking-tight">{summary!.utilization.toFixed(2)}%</p>
                                </div>
                            </div>

                            <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-800 mb-4">Daily Breakdown</h3>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                            <th className="py-4 px-4 font-bold text-center">Date</th>
                                            <th className="py-4 px-4 font-bold text-center">Sales</th>
                                            <th className="py-4 px-4 font-bold text-center">Prize Fund</th>
                                            <th className="py-4 px-4 font-bold text-center">Payouts</th>
                                            <th className="py-4 px-4 font-bold text-center">Utilization %</th>
                                            <th className="py-4 px-4 font-bold text-center">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">No generated batches found for this period</td>
                                            </tr>
                                        ) : (
                                            previewData.map((batch) => {
                                                const sales = batch.total_revenue || 0;
                                                const fund = sales * 0.339;
                                                const payout = batch.total_payout || 0;
                                                const util = fund > 0 ? (payout / fund) * 100 : 0;
                                                const balance = fund - payout;
                                                
                                                return (
                                                    <tr key={batch.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                                        <td className="py-4 px-4 font-semibold text-slate-800 text-center">{formatDate(batch.date)}</td>
                                                        <td className="py-4 px-4 font-bold text-slate-700 text-center">{formatCurrency(sales)}</td>
                                                        <td className="py-4 px-4 font-bold text-slate-700 text-center">{formatCurrency(fund)}</td>
                                                        <td className="py-4 px-4 font-bold text-slate-700 text-center">{formatCurrency(payout)}</td>
                                                        <td className="py-4 px-4 font-bold text-slate-700 text-center">{util.toFixed(2)}%</td>
                                                        <td className={`py-4 px-4 font-black text-center tracking-tight ${balance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                            {formatCurrency(balance)}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PrizeUtilizationPage;
