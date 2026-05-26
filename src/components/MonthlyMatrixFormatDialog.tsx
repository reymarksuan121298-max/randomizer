import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileStack, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportMatrixFormat } from "@/utils/matrixFormatExport";

export const MonthlyMatrixFormatDialog = ({ open, onOpenChange, batches }: any) => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const monthBatches = (batches || []).filter((b: any) => b.status === 'generated' || b.status === 'approved');
            if (monthBatches.length === 0) {
                toast.error("No valid batches found for this month");
                return;
            }

            const batchData = JSON.parse(localStorage.getItem(`batch_data_${monthBatches[0].id}`) || 'null');
            if (batchData) {
                await exportMatrixFormat(batchData);
                toast.success("Matrix Format Report exported");
            } else {
                toast.error("Batch data not found in storage");
            }
        } catch (error) {
            console.error(error);
            toast.error("Export failed");
        } finally {
            setIsExporting(false);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white text-slate-950">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-black uppercase text-slate-900">
                        <FileStack className="h-5 w-5 text-[#f7b500]" />
                        Export Matrix Format Report
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">
                        Generate the matrix format report for regulatory submission.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Reporting Period</Label>
                        <Select defaultValue="current">
                            <SelectTrigger className="border-slate-200 bg-slate-50 font-semibold text-slate-900">
                                <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem value="current" className="cursor-pointer font-semibold text-slate-700 hover:bg-slate-100">Current Month (March 2026)</SelectItem>
                                <SelectItem value="prev" className="cursor-pointer font-semibold text-slate-700 hover:bg-slate-100">Previous Month</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">Cancel</Button>
                    <Button onClick={handleExport} disabled={isExporting} className="gap-2 bg-[#f7b500] font-bold text-slate-950 hover:bg-[#e6a600]">
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileStack className="h-4 w-4" />}
                        Generate Matrix
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
