import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { exportAlphaList } from "@/utils/alphaListExport";
import { toast } from "sonner";

export const MonthlyAlphaListDialog = ({ open, onOpenChange, batches }: any) => {
    const [selectedMonth, setSelectedMonth] = useState("March 2026");
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const monthBatches = (batches || []).filter((b: any) => b.status === 'generated');
            if (monthBatches.length === 0) {
                toast.error("No generated batches found for this month");
                return;
            }

            const batchData = JSON.parse(localStorage.getItem(`batch_data_${monthBatches[0].id}`) || 'null');
            if (batchData) {
                await exportAlphaList(batchData);
                toast.success("Alpha List exported");
            } else {
                toast.error("Batch data not found in storage");
            }
        } catch (error) {
            toast.error("Export failed");
        } finally {
            setIsExporting(false);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Export Monthly Alpha List</DialogTitle>
                    <DialogDescription>
                        Select month to generate the comprehensive bet report.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Month</Label>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="March 2026">March 2026</SelectItem>
                                <SelectItem value="February 2026">February 2026</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter className="sm:justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleExport} disabled={isExporting} className="gap-2">
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                        Generate Alpha List
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
