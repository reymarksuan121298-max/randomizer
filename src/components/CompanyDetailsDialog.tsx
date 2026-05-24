import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "./ui/badge";

export const CompanyDetailsDialog = ({ open, onOpenChange, company }: any) => {
    if (!company) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <DialogTitle>{company.name}</DialogTitle>
                        <Badge variant="secondary">{company.code}</Badge>
                    </div>
                    <DialogDescription>
                        Full details for operational entity.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 border-y my-4">
                    <div className="grid grid-cols-3 text-sm">
                        <span className="text-muted-foreground">Address:</span>
                        <span className="col-span-2 font-medium">{company.address || "N/A"}</span>
                    </div>
                    <div className="grid grid-cols-3 text-sm">
                        <span className="text-muted-foreground">Contact:</span>
                        <span className="col-span-2 font-medium">{company.contact || "N/A"}</span>
                    </div>
                    <div className="grid grid-cols-3 text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="col-span-2 text-green-600 font-bold">ACTIVE</span>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button>Edit Details</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
