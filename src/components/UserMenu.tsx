import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { KeyRound, LogOut, UserRound } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { useAuth } from "@/contexts/AuthContext";

export function UserMenu() {
    const { user, profile, logout } = useAuth();
    const navigate = useNavigate();
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);

    return (
        <div className="absolute right-4 top-4 z-50">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="h-10 gap-2 rounded-lg border-2 border-[#f6b719] bg-white px-4 text-xs font-bold text-slate-900 shadow-sm"
                    >
                        <UserRound className="h-4 w-4 text-[#f6b719]" />
                        {profile?.fullName || user?.user_metadata?.full_name || user?.email || "Account"}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 rounded-lg border-slate-200 bg-white p-4 text-slate-950 shadow-xl">
                    <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
                        <UserRound className="mt-1 h-5 w-5 text-[#f6b719]" />
                        <div className="min-w-0">
                            <div className="truncate text-sm font-black">{profile?.fullName || user?.user_metadata?.full_name || user?.email}</div>
                            <div className="truncate text-xs text-slate-500">{user?.email}</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {(profile?.role || user?.user_metadata?.role) && (
                                    <span className="rounded bg-[#fff2bf] px-2 py-1 text-[10px] font-black uppercase text-[#d99a00]">
                                        {profile?.role || user?.user_metadata?.role}
                                    </span>
                                )}
                                {(profile?.company?.name || user?.user_metadata?.company) && (
                                    <span className="rounded bg-[#fff2bf] px-2 py-1 text-[10px] font-mono text-[#d99a00]">
                                        {profile?.company?.name || user?.user_metadata?.company}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <DropdownMenuItem className="mt-2 gap-2 rounded-md py-3 text-sm cursor-pointer" onClick={() => setIsPasswordOpen(true)}>
                        <KeyRound className="h-4 w-4" />
                        Change Password
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="gap-2 rounded-md py-3 text-sm cursor-pointer"
                        onClick={async () => {
                            await logout();
                            navigate("/login");
                        }}
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <ChangePasswordDialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen} />
        </div>
    );
}
