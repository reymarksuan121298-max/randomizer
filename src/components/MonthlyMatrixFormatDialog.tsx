import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileStack, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const MonthlyMatrixFormatDialog = ({ open, onOpenChange }: any) => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = () => {
        setIsExporting(true);
        setTimeout(() => {
            setIsExporting(false);
            toast.success("Matrix Format Report exported");
            onOpenChange(false);
        }, 1500);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Export Matrix Format Report</DialogTitle>
                    <DialogDescription>
                        Generate the matrix format report for regulatory submission.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Reporting Period</Label>
                        <Select defaultValue="current">
                            <SelectTrigger>
                                <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="current">Current Month (March 2026)</SelectItem>
                                <SelectItem value="prev">Previous Month</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter className="sm:justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleExport} disabled={isExporting} className="gap-2">
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileStack className="h-4 w-4" />}
                        Generate Matrix
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
