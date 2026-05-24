import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    ArrowLeft,
    Search,
    Calendar,
    FileText,
    LayoutTemplate,
    Trash2,
    Eye,
    Edit,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    FileSpreadsheet,
    Plus,
    AlertTriangle,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// ─── Batch type (also used by BatchEditPage) ────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

const generateId = (province: string, date: string) => {
    const code = province.toUpperCase().slice(0, 3);
    const d = date.replace(/-/g, "");
    const rand = Math.floor(Math.random() * 900000000 + 100000000);
    return `${code}-${d}-${rand}`;
};

const formatDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleString("en-PH", {
            month: "short", day: "numeric", year: "numeric",
            hour: "numeric", minute: "2-digit", hour12: true,
        });
    } catch {
        return iso;
    }
};

const statusStyle: Record<Batch["status"], string> = {
    approved: "bg-green-100/50 border border-green-200 text-green-600",
    generated: "bg-blue-100/50 border border-blue-200 text-blue-600",
    pending: "bg-yellow-100/50 border border-yellow-200 text-yellow-600",
};

const statusDot: Record<Batch["status"], string> = {
    approved: "bg-green-500",
    generated: "bg-blue-500",
    pending: "bg-yellow-500",
};

// ─── Default form state ──────────────────────────────────────────────────────
const emptyForm = () => ({
    name: "",
    province: "",
    date: new Date().toISOString().slice(0, 10),
    booklets: 4,
    createdBy: "Manager",
});

// ═══════════════════════════════════════════════════════════════════════════════
export const BatchesPage = () => {
    const navigate = useNavigate();

    // ── State ─────────────────────────────────────────────────────────────────
    const [batches, setBatches] = useState<Batch[]>(loadBatches);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    // Create dialog
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState(emptyForm());

    // Edit dialog
    const [editTarget, setEditTarget] = useState<Batch | null>(null);
    const [editForm, setEditForm] = useState({ name: "", province: "", booklets: 4, createdBy: "" });

    // Delete dialog
    const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);

    // ── Persist whenever batches changes ──────────────────────────────────────
    useEffect(() => {
        saveBatches(batches);
    }, [batches]);

    // ── Filtered + paginated list ─────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return batches.filter(
            (b) =>
                b.id.toLowerCase().includes(q) ||
                b.province.toLowerCase().includes(q) ||
                b.createdBy.toLowerCase().includes(q) ||
                b.name.toLowerCase().includes(q)
        );
    }, [batches, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // Reset to page 1 when search changes
    useEffect(() => { setPage(1); }, [search]);

    // ── CREATE ────────────────────────────────────────────────────────────────
    const handleCreate = () => {
        if (!createForm.name.trim() || !createForm.province.trim()) {
            toast.error("Batch name and province are required.");
            return;
        }
        const id = generateId(createForm.province, createForm.date);
        const newBatch: Batch = {
            id,
            name: createForm.name.trim(),
            province: createForm.province.trim(),
            date: createForm.date,
            booklets: Number(createForm.booklets) || 4,
            revenue: "₱0",
            createdAt: new Date().toISOString(),
            createdBy: createForm.createdBy.trim() || "Manager",
            status: "pending",
        };
        setBatches((prev) => [newBatch, ...prev]);
        setShowCreate(false);
        setCreateForm(emptyForm());
        toast.success(`Batch "${newBatch.name}" created!`);
    };

    // ── EDIT (open dialog) ────────────────────────────────────────────────────
    const openEdit = (batch: Batch) => {
        setEditTarget(batch);
        setEditForm({
            name: batch.name,
            province: batch.province,
            booklets: batch.booklets,
            createdBy: batch.createdBy,
        });
    };

    // ── UPDATE ────────────────────────────────────────────────────────────────
    const handleUpdate = () => {
        if (!editTarget) return;
        if (!editForm.name.trim() || !editForm.province.trim()) {
            toast.error("Batch name and province are required.");
            return;
        }
        setBatches((prev) =>
            prev.map((b) =>
                b.id === editTarget.id
                    ? {
                        ...b,
                        name: editForm.name.trim(),
                        province: editForm.province.trim(),
                        booklets: Number(editForm.booklets) || b.booklets,
                        createdBy: editForm.createdBy.trim() || b.createdBy,
                    }
                    : b
            )
        );
        toast.success("Batch updated!");
        setEditTarget(null);
    };

    // ── DELETE ────────────────────────────────────────────────────────────────
    const handleDelete = () => {
        if (!deleteTarget) return;
        // Also remove stored batch data
        localStorage.removeItem(`batch_data_${deleteTarget.id}`);
        setBatches((prev) => prev.filter((b) => b.id !== deleteTarget.id));
        toast.success(`Batch "${deleteTarget.name}" deleted.`);
        setDeleteTarget(null);
    };

    // ── Pagination helpers ────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 font-sans text-slate-800">
            <div className="max-w-6xl mx-auto">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={() => navigate('/')} className="h-8 gap-1 font-bold text-xs">
                            <ArrowLeft className="h-3 w-3" /> BACK
                        </Button>
                        <h1 className="text-3xl font-black text-yellow-400 uppercase tracking-tight">Saved Batches</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setShowCreate(true)}
                            className="h-10 gap-2 font-bold text-xs uppercase bg-yellow-400 hover:bg-yellow-500 text-yellow-900 shadow"
                        >
                            <Plus className="h-4 w-4" /> New Batch
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="gap-2 font-bold text-xs uppercase h-10 border-slate-200">
                                    <FileSpreadsheet className="h-4 w-4" /> Monthly Exports <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 font-bold uppercase text-xs">
                                <DropdownMenuItem className="gap-2 cursor-pointer py-3"><FileText className="h-4 w-4" /> Monthly Alpha List</DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 cursor-pointer py-3"><LayoutTemplate className="h-4 w-4" /> Matrix Format</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* ── Search ─────────────────────────────────────────────── */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="SEARCH BY BATCH NAME, PROVINCE, OR CREATOR..."
                        className="pl-12 h-12 bg-white border-slate-200 text-xs font-bold font-sans uppercase shadow-sm"
                    />
                </div>

                <p className="text-sm text-slate-500 mb-6">
                    {filtered.length === 0
                        ? "No batches found."
                        : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} batch${filtered.length !== 1 ? "es" : ""}`}
                </p>

                {/* ── Grid ───────────────────────────────────────────────── */}
                {paginated.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
                        <FileSpreadsheet className="h-12 w-12 opacity-30" />
                        <p className="text-sm font-bold uppercase">
                            {batches.length === 0 ? "No batches yet. Create your first batch!" : "No results match your search."}
                        </p>
                        {batches.length === 0 && (
                            <Button onClick={() => setShowCreate(true)} className="mt-2 gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold text-xs uppercase">
                                <Plus className="h-4 w-4" /> Create Batch
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                        {paginated.map((batch) => (
                            <Card key={batch.id} className="bg-white border text-slate-800 border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-1">
                                        <h3 className="font-black text-yellow-500 uppercase tracking-tight text-sm leading-tight">{batch.name || batch.id}</h3>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${statusStyle[batch.status]}`}>
                                            <div className={`h-2 w-2 rounded-full ${statusDot[batch.status]}`} />
                                            {batch.status}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 font-mono">{batch.id}</p>
                                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-6">{batch.province}</p>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Booklets</div>
                                            <div className="text-lg font-black">{batch.booklets}</div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Revenue</div>
                                            <div className="text-lg font-black">
                                                {batch.total_revenue != null
                                                    ? `₱${batch.total_revenue.toLocaleString()}`
                                                    : batch.revenue}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 mb-6">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                            <Calendar className="h-3.5 w-3.5 text-yellow-500" /> Batch Date: {batch.date}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                            <Calendar className="h-3 w-3 text-slate-400" /> Created: {formatDate(batch.createdAt)}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-medium pl-5">
                                            Created by: {batch.createdBy}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1 h-10 gap-2 font-bold text-xs uppercase"
                                            onClick={() => navigate(`/batch/${batch.id}`)}
                                        >
                                            <Eye className="h-4 w-4" /> View
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1 h-10 gap-2 font-bold text-xs uppercase"
                                            onClick={() => openEdit(batch)}
                                        >
                                            <Edit className="h-4 w-4" /> Edit
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            className="h-10 w-10 p-0 bg-red-500 hover:bg-red-600"
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

                {/* ── Pagination ─────────────────────────────────────────── */}
                {filtered.length > PAGE_SIZE && (
                    <div className="flex justify-center items-center gap-2">
                        <Button
                            variant="ghost"
                            className="h-10 gap-1 text-xs font-bold uppercase text-slate-500 hover:text-slate-800"
                            disabled={page === 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            <ChevronLeft className="h-4 w-4" /> Previous
                        </Button>

                        {pageNumbers().map((p, i) =>
                            p === "..." ? (
                                <span key={`ellipsis-${i}`} className="text-slate-400 px-2 font-bold">...</span>
                            ) : (
                                <Button
                                    key={p}
                                    variant={page === p ? "default" : "ghost"}
                                    className={`h-10 w-10 p-0 font-bold ${page === p ? "bg-yellow-400 hover:bg-yellow-500 text-yellow-900" : "text-slate-600 hover:bg-slate-100"}`}
                                    onClick={() => setPage(p as number)}
                                >
                                    {p}
                                </Button>
                            )
                        )}

                        <Button
                            variant="ghost"
                            className="h-10 gap-1 text-xs font-bold uppercase text-slate-800 hover:bg-slate-100"
                            disabled={page === totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                            Next <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* ════ CREATE DIALOG ══════════════════════════════════════════════ */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase tracking-tight">Create New Batch</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Fill in the details below to create a new lottery batch.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Batch Name *</Label>
                            <Input
                                placeholder="e.g. Cotabato City – Feb Draw"
                                value={createForm.name}
                                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Province / Area *</Label>
                            <Input
                                placeholder="e.g. Cotabato City"
                                value={createForm.province}
                                onChange={(e) => setCreateForm({ ...createForm, province: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Batch Date</Label>
                                <Input
                                    type="date"
                                    value={createForm.date}
                                    onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Booklets</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={createForm.booklets}
                                    onChange={(e) => setCreateForm({ ...createForm, booklets: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Created By</Label>
                            <Input
                                placeholder="e.g. Cotabato Manager"
                                value={createForm.createdBy}
                                onChange={(e) => setCreateForm({ ...createForm, createdBy: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button variant="outline" onClick={() => { setShowCreate(false); setCreateForm(emptyForm()); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} className="gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold">
                            <Plus className="h-4 w-4" /> Create Batch
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ════ EDIT DIALOG ════════════════════════════════════════════════ */}
            <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase tracking-tight">Edit Batch</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Update the batch details below.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Batch Name *</Label>
                            <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Province / Area *</Label>
                            <Input
                                value={editForm.province}
                                onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Booklets</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={editForm.booklets}
                                    onChange={(e) => setEditForm({ ...editForm, booklets: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Created By</Label>
                                <Input
                                    value={editForm.createdBy}
                                    onChange={(e) => setEditForm({ ...editForm, createdBy: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
                        <Button onClick={handleUpdate} className="gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold">
                            <Edit className="h-4 w-4" /> Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ════ DELETE CONFIRMATION DIALOG ═════════════════════════════════ */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600 font-black uppercase">
                            <AlertTriangle className="h-5 w-5" /> Delete Batch
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Confirm deletion of this batch. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <p className="text-sm text-slate-600 py-2">
                        Are you sure you want to delete{" "}
                        <span className="font-bold text-slate-800">"{deleteTarget?.name || deleteTarget?.id}"</span>?
                        This action cannot be undone and all associated data will be permanently removed.
                    </p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} className="gap-2 bg-red-500 hover:bg-red-600">
                            <Trash2 className="h-4 w-4" /> Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BatchesPage;
