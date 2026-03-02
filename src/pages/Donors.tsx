import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Modal } from "@/components/Modal";
import {
    Plus, Search, MoreVertical, X, CheckCircle2,
    ChevronLeft, ChevronRight, Loader2, Pencil, Trash2,
    User, Phone, MapPin, Mail, FileText
} from "lucide-react";
import { cn } from "@/utils/cn";
import { supabase } from "@/lib/supabase";
import type { Donor } from "@/types/database";

// ─── Constants ───────────────────────────────────────────────
const PAGE_SIZE = 10;

// ─── Form default ────────────────────────────────────────────
const emptyForm = () => ({
    name: "",
    phone: "",
    address: "",
    email: "",
    tax_id: "",
    notes: "",
});

// ─── Field component ─────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}

const inputCls = "w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-600/30 focus:border-red-600 outline-none transition-all";

// ─── Main component ───────────────────────────────────────────
export default function Donors() {
    // list state
    const [donors, setDonors] = useState<Donor[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    // add/edit modal
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Donor | null>(null);
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    // delete confirm
    const [deleteTarget, setDeleteTarget] = useState<Donor | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // action menu
    const [menuOpen, setMenuOpen] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fn = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null); };
        document.addEventListener("mousedown", fn);
        return () => document.removeEventListener("mousedown", fn);
    }, []);

    // ── fetch ──────────────────────────────────────────────────
    const fetchDonors = useCallback(async () => {
        setLoading(true);
        let q = supabase.from("donors").select("*", { count: "exact" })
            .order("name", { ascending: true })
            .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

        if (search.trim()) {
            q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,address.ilike.%${search}%`);
        }

        const { data, count, error } = await q;
        if (!error) {
            setDonors(data || []);
            setTotal(count || 0);
        }
        setLoading(false);
    }, [page, search]);

    useEffect(() => {
        fetchDonors();
    }, [fetchDonors]);

    // ── handlers ────────────────────────────────────────────────
    const openAdd = () => {
        setEditTarget(null);
        setForm(emptyForm());
        setFormError("");
        setModalOpen(true);
    };

    const openEdit = (d: Donor) => {
        setEditTarget(d);
        setForm({
            name: d.name,
            phone: d.phone || "",
            address: d.address || "",
            email: d.email || "",
            tax_id: (d as any).tax_id || "",
            notes: d.notes || "",
        });
        setFormError("");
        setModalOpen(true);
        setMenuOpen(null);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            setFormError("請填寫姓名");
            return;
        }

        setSaving(true);
        setFormError("");

        const payload = {
            name: form.name.trim(),
            phone: form.phone.trim() || null,
            address: form.address.trim() || null,
            email: form.email.trim() || null,
            tax_id: form.tax_id.trim() || null,
            notes: form.notes.trim() || null,
            updated_at: new Date().toISOString(),
        };

        const { error } = editTarget
            ? await (supabase.from("donors") as any).update(payload).eq("id", editTarget.id)
            : await (supabase.from("donors") as any).insert(payload);

        if (error) {
            console.error("Supabase Save Error:", error);
            setFormError(error.message);
            setSaving(false);
            return;
        }

        setModalOpen(false);
        fetchDonors();
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        const { error } = await supabase.from("donors").delete().eq("id", deleteTarget.id);
        if (!error) {
            setDeleteTarget(null);
            fetchDonors();
        }
        setDeleteLoading(false);
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Header */}
                <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-5 flex items-center justify-between z-20">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">往來對象管理</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">維護信眾或往來單位基本資料，方便收據開立或支出對帳時快速帶入。</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={openAdd}
                            className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-lg transition-all shadow-sm flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            新增對象 (個人/單位)
                        </button>
                    </div>
                </header>

                {/* Filters/Search */}
                <div className="flex-none px-8 py-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 z-10">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="搜尋對象姓名、單位、電話、地址..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-red-700/20 focus:border-red-700 outline-none transition-all placeholder:text-slate-400"
                        />
                    </div>
                    <div className="text-xs font-medium text-slate-400 ml-auto">
                        共 {total} 筆資料
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto px-8 py-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-4">姓名 / 單位</th>
                                    <th className="px-6 py-4">電話 / 統編</th>
                                    <th className="px-6 py-4">地址</th>
                                    <th className="px-6 py-4">備註</th>
                                    <th className="px-6 py-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <Loader2 className="w-8 h-8 text-red-700 animate-spin mx-auto mb-3" />
                                            <p className="text-slate-400 text-sm">正在讀取資料...</p>
                                        </td>
                                    </tr>
                                ) : donors.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <User className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                            </div>
                                            <p className="font-medium">尚無往來對象資料</p>
                                            <button onClick={openAdd} className="mt-2 text-red-700 hover:underline text-sm">立即新增第一筆</button>
                                        </td>
                                    </tr>
                                ) : (
                                    donors.map((d) => (
                                        <tr key={d.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-700 dark:text-red-400 font-bold text-xs">
                                                        {d.name.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-slate-900 dark:text-white">{d.name}</span>
                                                </div>
                                            </td>
                                            <div className="flex flex-col gap-1 text-slate-600 dark:text-slate-400 text-sm">
                                                <div className="flex items-center gap-2 italic">
                                                    <Phone className="w-3.5 h-3.5 opacity-50" />
                                                    {d.phone || "-"}
                                                </div>
                                                {(d as any).tax_id && (
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit">
                                                        ID: {(d as any).tax_id}
                                                    </div>
                                                )}
                                            </div>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm max-w-[250px] truncate">
                                                    <MapPin className="w-3.5 h-3.5 opacity-50" />
                                                    {d.address || "-"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-500 text-xs italic truncate max-w-[150px]">
                                                    <FileText className="w-3.5 h-3.5 opacity-50" />
                                                    {d.notes || "-"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right relative">
                                                <button
                                                    onClick={() => setMenuOpen(menuOpen === d.id ? null : d.id)}
                                                    className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                                {menuOpen === d.id && (
                                                    <div
                                                        ref={menuRef}
                                                        className="absolute right-6 top-12 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-30"
                                                    >
                                                        <button
                                                            onClick={() => openEdit(d)}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" /> 編輯資料
                                                        </button>
                                                        <button
                                                            onClick={() => { setDeleteTarget(d); setMenuOpen(null); }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors font-medium border-t border-slate-100 dark:border-slate-700 mt-1"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> 刪除紀錄
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 px-2">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                第 {page} 頁 / 共 {totalPages} 頁
                            </p>
                            <div className="flex gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)}
                                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(page + 1)}
                                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Add/Edit Modal */}
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editTarget ? "編輯對象資訊" : "新增往來對象"}
                width="max-w-md"
            >
                <div className="flex flex-col gap-5 py-2">
                    {formError && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                            <X className="w-4 h-4" /> {formError}
                        </div>
                    )}

                    <Field label="姓名 / 單位名稱" required>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className={inputCls}
                            placeholder="個人姓名或單位名稱"
                            autoFocus
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="身分證 / 統一編號">
                            <input
                                type="text"
                                value={form.tax_id}
                                onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                                className={inputCls}
                                placeholder="身分證或統編"
                            />
                        </Field>
                        <Field label="電話">
                            <input
                                type="text"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className={inputCls}
                                placeholder="聯絡電話"
                            />
                        </Field>
                    </div>

                    <Field label="地址">
                        <input
                            type="text"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                            className={inputCls}
                            placeholder="完整聯絡地址"
                        />
                    </Field>

                    <Field label="備註">
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className={cn(inputCls, "h-24 resize-none")}
                            placeholder="其他註記..."
                        />
                    </Field>

                    <div className="flex gap-3 justify-end mt-4">
                        <button
                            onClick={() => setModalOpen(false)}
                            className="px-5 py-2.5 font-bold text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-lg shadow-sm transition-all flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {saving ? "儲存中..." : "確認儲存"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="確認刪除"
                width="max-w-sm"
            >
                <div className="flex flex-col gap-6 py-2 items-center text-center">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-700">
                        <Trash2 className="w-8 h-8" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <p className="font-bold text-slate-900 dark:text-white">您確定要刪除「{deleteTarget?.name}」嗎？</p>
                        <p className="text-sm text-slate-500">此動作將無法復原，請務必確認。</p>
                    </div>
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={() => setDeleteTarget(null)}
                            className="flex-1 py-2.5 font-bold text-sm text-slate-500 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleteLoading}
                            className="flex-1 py-2.5 bg-red-700 text-white font-bold rounded-lg text-sm hover:bg-red-800 transition-colors shadow-sm disabled:opacity-50"
                        >
                            {deleteLoading ? "刪除中..." : "確認刪除"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
