import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { KeyRound, ShieldCheck } from "lucide-react";

export const ChangePasswordDialog = ({ open, onOpenChange }: any) => {
    const [passwords, setPasswords] = useState({
        current: "",
        new: "",
        confirm: ""
    });

    const handleUpdate = async () => {
        if (passwords.new !== passwords.confirm) {
            return toast.error("New passwords do not match");
        }
        if (passwords.new.length < 8) {
            return toast.error("New password must be at least 8 characters.");
        }

        const { error } = await supabase.auth.updateUser({ password: passwords.new });
        if (error) {
            return toast.error(error.message);
        }

        toast.success("Password updated successfully");
        setPasswords({ current: "", new: "", confirm: "" });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white text-slate-950">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-black uppercase text-slate-900">
                        <KeyRound className="h-5 w-5 text-[#f7b500]" />
                        Change Password
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">
                        Update your account security credentials.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Current Password</Label>
                        <Input type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} className="border-slate-200 bg-slate-50 font-mono text-sm text-slate-950" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">New Password</Label>
                        <Input type="password" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} className="border-slate-200 bg-slate-50 font-mono text-sm text-slate-950" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Confirm New Password</Label>
                        <Input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className="border-slate-200 bg-slate-50 font-mono text-sm text-slate-950" />
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-200 bg-white text-slate-700">Cancel</Button>
                    <Button onClick={handleUpdate} className="gap-2 bg-[#f7b500] font-bold text-slate-950 hover:bg-[#e6a600]">
                        <ShieldCheck className="h-4 w-4" />
                        Update Password
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
