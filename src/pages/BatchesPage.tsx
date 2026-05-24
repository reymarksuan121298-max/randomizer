import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Calendar, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Edit, Eye, FileSpreadsheet, FileText, LayoutTemplate, Save, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    databaseEnabled,
    deleteBatchFromDatabase,
    getBatchDetailFromDatabase,
    listBatchesFromDatabase,
    updateBatchInDatabase,
} from "@/lib/database";

export interface Batch {
    id: string;
    name: string;
    province: string;
    date: string;
    booklets: number;
    revenue: string;
    createdAt: string;
    createdBy: string;
    status: "pending" | "generated" | "approved";
    total_revenue?: number;
    total_payout?: number;
}

const BATCHES_KEY = "batches";
const PAGE_SIZE = 9;

const loadBatches = (): Batch[] => {
    try {
        const raw = localStorage.getItem(BATCHES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveBatches = (batches: Batch[]) => {
    localStorage.setItem(BATCHES_KEY, JSON.stringify(batches));
};

const formatDateTime = (iso: string) => {
    try {
        return new Date(iso).toLocaleString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    } catch {
        return iso;
    }
};

const statusLabel: Record<Batch["status"], string> = {
    approved: "Approved",
    generated: "Approved",
    pending: "Pending",
};

const statusStyle: Record<Batch["status"], string> = {
    approved: "bg-emerald-100 text-emerald-600",
    generated: "bg-emerald-100 text-emerald-600",
    pending: "bg-amber-100 text-amber-600",
};

interface SerialRange {
    bookletNumber: number;
    start: string;
    end: string;
    count: number;
}

const emptyForm = () => ({
    name: "",
    province: "",
    date: "",
    totalPayout: "",
    booklets: 4,
    createdBy: "Manager",
    serialRanges: [] as SerialRange[],
});

const formatCurrency = (value?: number, fallback = "PHP 0") => {
    if (value == null) return fallback;
    return `PHP ${value.toLocaleString()}`;
};

const formatDisplayDate = (iso: string) => {
    if (!iso) return "";
    const date = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(date.getTime())) return iso;
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${month}/${day}/${date.getFullYear()}`;
};

const parseDisplayDate = (value: string) => {
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return value;
    const [, month, day, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const getBatchDetails = (batchId: string) => {
    try {
        const raw = localStorage.getItem(`batch_data_${batchId}`);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const setLocalBatchDetails = (batchId: string, details: any) => {
    localStorage.setItem(`batch_data_${batchId}`, JSON.stringify(details));
};

const deriveSerialRanges = (batch: Batch): SerialRange[] => {
    const details = getBatchDetails(batch.id);
    if (details?.booklets?.length) {
        return details.booklets.map((booklet: any, index: number) => {
            const serials: string[] = [];
            booklet.sheets?.forEach((sheet: any) => {
                sheet.tickets?.forEach((ticket: any) => {
                    if (ticket.serialNumber) serials.push(String(ticket.serialNumber));
                });
            });

            serials.sort();
            const fallbackStart = String(1000001 + index * 250);
            const fallbackEnd = String(Number(fallbackStart) + 249);

            return {
                bookletNumber: booklet.bookletNumber || index + 1,
                start: serials[0] || booklet.serialStart || fallbackStart,
                end: serials[serials.length - 1] || booklet.serialEnd || fallbackEnd,
                count: serials.length || 250,
            };
        });
    }

    const codeMatch = batch.id.match(/(\d{9,})$/);
    const base = codeMatch ? Number(codeMatch[1]) : 1000001;
    return Array.from({ length: batch.booklets || 1 }, (_, index) => {
        const start = base + index * 250;
        return {
            bookletNumber: index + 1,
            start: String(start),
            end: String(start + 249),
            count: 250,
        };
    });
};

export const BatchesPage = () => {
    const navigate = useNavigate();
    const [batches, setBatches] = useState<Batch[]>(loadBatches);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [editTarget, setEditTarget] = useState<Batch | null>(null);
    const [editForm, setEditForm] = useState(emptyForm());
    const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);

    useEffect(() => {
        saveBatches(batches);
    }, [batches]);

    useEffect(() => {
        if (!databaseEnabled()) return;

        let cancelled = false;
        listBatchesFromDatabase()
            .then((dbBatches) => {
                if (cancelled) return;
                setBatches(dbBatches);
                saveBatches(dbBatches);
            })
            .catch((error) => {
                console.error(error);
                toast.error("Could not load batches from database. Showing local data.");
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return batches.filter(
            (b) =>
                b.id.toLowerCase().includes(q) ||
                b.name.toLowerCase().includes(q) ||
                b.province.toLowerCase().includes(q) ||
                b.createdBy.toLowerCase().includes(q)
        );
    }, [batches, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => {
        setPage(1);
    }, [search]);

    const openEdit = async (batch: Batch) => {
        setEditTarget(batch);
        let details = getBatchDetails(batch.id);
        if (!details && databaseEnabled()) {
            try {
                details = await getBatchDetailFromDatabase(batch.id);
                if (details) setLocalBatchDetails(batch.id, details);
            } catch (error) {
                console.error(error);
            }
        }
        setEditForm({
            name: batch.name,
            province: batch.province,
            date: formatDisplayDate(batch.date),
            totalPayout: String((batch.total_payout || 0).toFixed(2)),
            booklets: batch.booklets,
            createdBy: batch.createdBy,
            serialRanges: deriveSerialRanges(batch),
        });
    };

    const handleUpdate = async () => {
        if (!editTarget) return;
        if (!editForm.name.trim() || !editForm.province.trim()) {
            toast.error("Batch name and province are required.");
            return;
        }

        const nextDate = parseDisplayDate(editForm.date);
        const nextPayout = Number(editForm.totalPayout) || 0;

        try {
            if (databaseEnabled()) {
                await updateBatchInDatabase(editTarget.id, {
                    name: editForm.name.trim(),
                    province: editForm.province.trim(),
                    date: nextDate,
                    totalPayout: nextPayout,
                });
            }
        } catch (error) {
            console.error(error);
            toast.error("Database update failed.");
            return;
        }

        setBatches((prev) =>
            prev.map((batch) =>
                batch.id === editTarget.id
                    ? {
                        ...batch,
                        name: editForm.name.trim(),
                        province: editForm.province.trim(),
                        date: nextDate,
                        total_payout: nextPayout,
                        booklets: Number(editForm.booklets) || batch.booklets,
                        createdBy: editForm.createdBy.trim() || batch.createdBy,
                    }
                    : batch
            )
        );

        const details = getBatchDetails(editTarget.id);
        if (details) {
            details.name = editForm.name.trim();
            details.province = editForm.province.trim();
            details.date = nextDate;
            details.totalPayout = nextPayout;
            details.booklets?.forEach((booklet: any, index: number) => {
                const range = editForm.serialRanges[index];
                if (!range) return;

                booklet.serialStart = range.start;
                booklet.serialEnd = range.end;

                let nextSerial = Number(range.start);
                const width = range.start.length;
                if (!Number.isFinite(nextSerial)) return;

                booklet.sheets?.forEach((sheet: any) => {
                    sheet.tickets?.forEach((ticket: any) => {
                        ticket.serialNumber = String(nextSerial).padStart(width, "0");
                        nextSerial += 1;
                    });
                });
            });
            setLocalBatchDetails(editTarget.id, details);
        }

        toast.success("Batch updated.");
        setEditTarget(null);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            if (databaseEnabled()) {
                await deleteBatchFromDatabase(deleteTarget.id);
            }
        } catch (error) {
            console.error(error);
            toast.error("Database delete failed.");
            return;
        }

        localStorage.removeItem(`batch_data_${deleteTarget.id}`);
        setBatches((prev) => prev.filter((batch) => batch.id !== deleteTarget.id));
        toast.success(`Batch "${deleteTarget.name}" deleted.`);
        setDeleteTarget(null);
    };

    const pageNumbers = () => {
        const pages: (number | "...")[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push("...");
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
            if (page < totalPages - 2) pages.push("...");
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="min-h-screen bg-[#f6f7f9] px-6 py-7 text-slate-900">
            <div className="mx-auto max-w-[1180px]">
                <header className="mb-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            className="h-9 rounded-md border-slate-200 bg-white px-4 text-[11px] font-black uppercase text-slate-900 shadow-sm"
                            onClick={() => navigate("/")}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                        <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-[#f7b500]">
                            Saved Batches
                        </h1>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="h-9 rounded-md border-slate-200 bg-white px-4 text-[11px] font-black uppercase text-slate-900 shadow-sm"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                Monthly Exports
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-md border-slate-200 bg-white p-1.5 shadow-lg">
                            <DropdownMenuItem className="gap-2 rounded-sm py-3 text-[11px] font-black uppercase">
                                <FileText className="h-4 w-4" />
                                Monthly Alpha List
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 rounded-sm py-3 text-[11px] font-black uppercase">
                                <LayoutTemplate className="h-4 w-4" />
                                Matrix Format
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="SEARCH BY BATCH NAME, PROVINCE, OR CREATOR..."
                        className="h-9 rounded-md border-slate-200 bg-white pl-10 text-[11px] font-black uppercase shadow-sm placeholder:text-slate-500"
                    />
                </div>

                <p className="mb-6 text-sm text-slate-600">
                    {filtered.length === 0
                        ? "No batches found."
                        : `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} batches`}
                </p>

                {paginated.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-24 text-slate-400">
                        <FileSpreadsheet className="h-12 w-12 opacity-40" />
                        <p className="text-sm font-black uppercase">
                            {batches.length === 0 ? "No batches yet." : "No results match your search."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {paginated.map((batch) => (
                            <Card key={batch.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
                                <CardContent className="p-5">
                                    <div className="mb-2 flex items-start justify-between gap-3">
                                        <h2 className="font-mono text-sm font-black uppercase tracking-tight text-[#f7b500]">
                                            {batch.id}
                                        </h2>
                                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${statusStyle[batch.status]}`}>
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            {statusLabel[batch.status]}
                                        </span>
                                    </div>

                                    <p className="mb-5 truncate text-sm font-medium uppercase tracking-wide text-slate-600">
                                        {batch.province || batch.name}
                                    </p>

                                    <div className="mb-5 grid grid-cols-2 gap-3">
                                        <Metric label="Booklets" value={batch.booklets.toLocaleString()} />
                                        <Metric
                                            label="Revenue"
                                            value={
                                                batch.total_revenue != null
                                                    ? `PHP ${batch.total_revenue.toLocaleString()}`
                                                    : batch.revenue
                                            }
                                        />
                                    </div>

                                    <div className="mb-5 space-y-2">
                                        <div className="flex items-center gap-2 text-[12px] font-black text-slate-900">
                                            <Calendar className="h-3.5 w-3.5 text-[#f7b500]" />
                                            Batch Date: {batch.date}
                                        </div>
                                        <div className="flex items-center gap-2 text-[12px] text-slate-500">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                            Created: {formatDateTime(batch.createdAt)}
                                        </div>
                                        <p className="pl-5 text-[12px] text-slate-500">Created by: {batch.createdBy}</p>
                                    </div>

                                    <div className="grid grid-cols-[1fr_1fr_38px] gap-2">
                                        <Button
                                            variant="outline"
                                            className="h-8 rounded-md border-slate-200 bg-white text-sm font-bold text-slate-900"
                                            onClick={() => navigate(`/batch/${batch.id}`)}
                                        >
                                            <Eye className="h-4 w-4" />
                                            View
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-8 rounded-md border-slate-200 bg-white text-sm font-bold text-slate-900"
                                            onClick={() => openEdit(batch)}
                                        >
                                            <Edit className="h-4 w-4" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            className="h-8 rounded-md bg-red-500 p-0 hover:bg-red-600"
                                            onClick={() => setDeleteTarget(batch)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {filtered.length > PAGE_SIZE && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                        <Button variant="ghost" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        {pageNumbers().map((p, i) =>
                            p === "..." ? (
                                <span key={`ellipsis-${i}`} className="px-2 text-slate-400">...</span>
                            ) : (
                                <Button
                                    key={p}
                                    variant={page === p ? "default" : "ghost"}
                                    className={`h-9 w-9 p-0 font-bold ${page === p ? "bg-[#f7b500] text-white hover:bg-[#e6a600]" : ""}`}
                                    onClick={() => setPage(p)}
                                >
                                    {p}
                                </Button>
                            )
                        )}
                        <Button variant="ghost" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
                <DialogContent className="max-h-[92vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl sm:max-w-[760px] [&>button]:hidden">
                    <DialogHeader>
                        <DialogTitle className="sr-only">Edit Batch</DialogTitle>
                        <DialogDescription className="px-3 pt-3 text-sm text-slate-600">
                            Make changes to your batch details
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-3 pb-3">
                        <div className="rounded-lg border border-slate-200 bg-white p-5">
                            <div className="space-y-4">
                                <EditField label="Batch Name">
                                    <Input
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="h-9 border-slate-200 bg-white font-mono text-sm text-slate-950"
                                    />
                                </EditField>

                                <EditField
                                    label="Batch Date (for advance generation)"
                                    helper="Edit the date this batch represents. Created date remains unchanged for record keeping."
                                >
                                    <div className="relative">
                                        <Input
                                            value={editForm.date}
                                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                            className="h-9 border-slate-200 bg-white pr-10 font-mono text-sm text-slate-950"
                                        />
                                        <Calendar className="absolute left-[102px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-700" />
                                    </div>
                                </EditField>

                                <EditField label="Total Payout" helper={`Current: ${formatCurrency(editTarget?.total_payout || 0)}`}>
                                    <Input
                                        value={editForm.totalPayout}
                                        onChange={(e) => setEditForm({ ...editForm, totalPayout: e.target.value })}
                                        className="h-9 border-slate-200 bg-white font-mono text-sm text-slate-950"
                                    />
                                </EditField>
                            </div>

                            <div className="mt-7 grid grid-cols-2 gap-x-20 gap-y-5">
                                <SummaryItem label="Province" value={editForm.province} />
                                <SummaryItem label="Total Booklets" value={String(editForm.booklets)} />
                                <SummaryItem label="Total Revenue" value={formatCurrency(editTarget?.total_revenue, editTarget?.revenue || "PHP 0")} />
                                <SummaryItem label="Status" value={editTarget ? statusLabel[editTarget.status] : ""} />
                            </div>

                            <div className="mt-7 border-t border-slate-200 pt-6">
                                <h3 className="text-sm font-black uppercase tracking-tight">Booklet Serial Number Ranges</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Edit the serial number ranges for each booklet in this batch ({editForm.serialRanges.length || editForm.booklets} booklets)
                                </p>

                                <div className="mt-4 space-y-3">
                                    {editForm.serialRanges.map((range, index) => (
                                        <div key={range.bookletNumber} className="grid grid-cols-[100px_1fr_1fr_100px] items-end gap-3 rounded-lg bg-slate-50 px-3 py-3">
                                            <div className="pb-2 text-sm text-slate-600">Booklet {range.bookletNumber}</div>
                                            <SerialField
                                                label="Start"
                                                value={range.start}
                                                onChange={(value) => {
                                                    const next = [...editForm.serialRanges];
                                                    const start = Number(value);
                                                    next[index] = {
                                                        ...next[index],
                                                        start: value,
                                                        end: Number.isFinite(start) ? String(start + next[index].count - 1) : next[index].end,
                                                    };
                                                    setEditForm({ ...editForm, serialRanges: next });
                                                }}
                                            />
                                            <SerialField
                                                label="End"
                                                value={range.end}
                                                onChange={(value) => {
                                                    const next = [...editForm.serialRanges];
                                                    const end = Number(value);
                                                    const start = Number(next[index].start);
                                                    next[index] = {
                                                        ...next[index],
                                                        end: value,
                                                        count: Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start + 1) : next[index].count,
                                                    };
                                                    setEditForm({ ...editForm, serialRanges: next });
                                                }}
                                            />
                                            <SerialField
                                                label="Count"
                                                value={String(range.count)}
                                                onChange={(value) => {
                                                    const next = [...editForm.serialRanges];
                                                    const count = Number(value) || 0;
                                                    const start = Number(next[index].start);
                                                    next[index] = {
                                                        ...next[index],
                                                        count,
                                                        end: Number.isFinite(start) ? String(start + count - 1) : next[index].end,
                                                    };
                                                    setEditForm({ ...editForm, serialRanges: next });
                                                }}
                                                className="border-green-500 bg-green-50 text-green-700"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <DialogFooter className="mt-6 gap-3 border-t border-slate-100 pt-4 sm:justify-start">
                                <Button onClick={handleUpdate} className="h-9 gap-2 rounded-md bg-[#f7b500] px-5 font-medium text-slate-950 hover:bg-[#e6a600]">
                                    <Save className="h-4 w-4" />
                                    Save Changes
                                </Button>
                                <Button variant="outline" className="h-9 rounded-md border-slate-200 bg-white px-5 text-slate-950" onClick={() => setEditTarget(null)}>
                                    Cancel
                                </Button>
                            </DialogFooter>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600 font-black uppercase">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Batch
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Confirm deletion of this batch. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <p className="py-2 text-sm text-slate-600">
                        Are you sure you want to delete{" "}
                        <span className="font-bold text-slate-800">"{deleteTarget?.name || deleteTarget?.id}"</span>?
                        This action cannot be undone and all associated data will be permanently removed.
                    </p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} className="gap-2 bg-red-500 hover:bg-red-600">
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-lg bg-slate-50 px-3 py-4">
        <div className="mb-1 text-[10px] text-slate-500">{label}</div>
        <div className="truncate text-base font-black text-slate-950">{value}</div>
    </div>
);

const EditField = ({ label, helper, children }: { label: string; helper?: string; children: ReactNode }) => (
    <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-950">{label}</Label>
        {children}
        {helper && <p className="text-xs text-slate-500">{helper}</p>}
    </div>
);

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
    <div>
        <div className="text-sm text-slate-500">{label}</div>
        <div className="mt-1 font-mono text-base text-slate-950">{value}</div>
    </div>
);

const SerialField = ({
    label,
    value,
    onChange,
    className = "",
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    className?: string;
}) => (
    <div className="space-y-1">
        <Label className="text-xs text-slate-500">{label}</Label>
        <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`h-8 border-slate-200 bg-white font-mono text-sm text-slate-950 ${className}`}
        />
    </div>
);

export default BatchesPage;
