import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Modal } from "@/components/Modal";
import { ImportModal, ImportRowStatus } from "@/components/ImportModal";
import {
  Download, Plus, Search, Calendar, ChevronDown, Upload,
  MoreVertical, Info, X, CheckCircle2, AlertTriangle,
  ChevronLeft, ChevronRight, Loader2, Pencil, Trash2, ArrowUpDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { supabase } from "@/lib/supabase";
import type { Receipt, Donor } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";

// ─── Constants ───────────────────────────────────────────────
const CATEGORIES = ["光明燈", "平安燈", "其他收入", "法會收入", "其他"];
const PAYMENT_METHODS = ["現金", "轉帳", "匯款", "其他"];
const CATEGORY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  "光明燈": { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  "平安燈": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  "其他收入": { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  "法會收入": { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  "其他": { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
};
const PAGE_SIZE = 10;

// ─── Form default ────────────────────────────────────────────
const emptyForm = () => ({
  receipt_no: "",
  date: new Date().toISOString().split("T")[0],
  donor_id: "" as string | null,
  donor_name: "",
  phone: "",
  address: "",
  category: "",
  amount: "",
  handler: "",
  payment_method: "",
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
export default function Receipts() {
  const { profile: currentProfile } = useAuth();
  // list state
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<boolean>(false); // false = desc, true = asc

  // import modal
  const [importOpen, setImportOpen] = useState(false);

  // detail drawer
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidLoading, setVoidLoading] = useState(false);

  // add/edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Receipt | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // autocomplete
  const [donorSuggestions, setDonorSuggestions] = useState<Donor[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) setShowSuggestions(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const fetchDonorSuggestions = async (val: string) => {
    if (!val.trim()) {
      setDonorSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const { data } = await supabase.from("donors")
      .select("*")
      .ilike("name", `%${val}%`)
      .limit(5);
    setDonorSuggestions(data || []);
    setShowSuggestions((data || []).length > 0);
  };

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Receipt | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // action menu
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // ── fetch ──────────────────────────────────────────────────
  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("receipts").select("*", { count: "exact" })
      .order(sortColumn, { ascending: sortDirection })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (search.trim()) {
      q = q.or(`receipt_no.ilike.%${search}%,donor_name.ilike.%${search}%,category.ilike.%${search}%`);
    }

    q = q.eq("status", "normal");

    const { data, count, error } = await q;
    if (!error) { setReceipts(data ?? []); setTotal(count ?? 0); }
    setLoading(false);
  }, [search, page, sortColumn, sortDirection]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  // ── open add modal ─────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setForm({
      ...emptyForm(),
      handler: currentProfile?.email || "",
    });
    setFormError("");
    setModalOpen(true);
  };

  // ── open edit modal ────────────────────────────────────────
  const openEdit = (r: Receipt) => {
    setEditTarget(r);
    setForm({
      receipt_no: r.receipt_no,
      date: r.date,
      donor_id: r.donor_id || "",
      donor_name: r.donor_name,
      phone: r.phone ?? "",
      address: r.address ?? "",
      category: r.category,
      amount: String(r.amount),
      handler: r.handler ?? "",
      payment_method: r.payment_method ?? "現金",
    });
    setFormError("");
    setModalOpen(true);
    setDrawerOpen(false);
    setMenuOpen(null);
  };

  // ── save (add or edit) ─────────────────────────────────────
  const handleSave = async () => {
    if (!form.donor_name.trim() || !form.amount || !form.category) {
      setFormError("請填寫必填欄位：姓名、科目、金額"); return;
    }
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) { setFormError("金額必須為正數"); return; }

    setSaving(true); setFormError("");
    const payload = {
      receipt_no: form.receipt_no.trim() || `REC-${Date.now()}`,
      date: form.date,
      donor_id: form.donor_id || null,
      donor_name: form.donor_name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      category: form.category,
      amount: amt,
      handler: form.handler.trim() || null,
      payment_method: form.payment_method,
      status: "normal" as const,
    };

    const { error } = editTarget
      ? await (supabase.from("receipts") as any).update(payload).eq("id", editTarget.id)
      : await (supabase.from("receipts") as any).insert(payload);

    if (error) { setFormError(error.message); setSaving(false); return; }
    setModalOpen(false);
    fetchReceipts();
    setSaving(false);
  };

  // ── void ───────────────────────────────────────────────────
  const handleVoid = async () => {
    if (!selected || !voidReason.trim()) return;
    setVoidLoading(true);
    await (supabase.from("receipts") as any).update({ status: "voided", void_reason: voidReason }).eq("id", selected.id);
    setDrawerOpen(false); setVoidReason(""); fetchReceipts(); setVoidLoading(false);
  };

  // ── delete ────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await supabase.from("receipts").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null); setDrawerOpen(false); fetchReceipts(); setDeleteLoading(false);
  };

  // ── handle import ──────────────────────────────────────────
  const validateImportRow = async (row: Record<string, string>): Promise<{ status: ImportRowStatus; reason?: string }> => {
    // 1. Check required fields
    if (!row["姓名"] || !row["科目"] || !row["金額"] || !row["日期"]) {
      return { status: "error", reason: "缺少必填欄位 (姓名/科目/金額/日期)" };
    }
    const amt = parseFloat(row["金額"]);
    if (isNaN(amt) || amt <= 0) return { status: "error", reason: "金額格式錯誤" };

    // 2. Format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(row["日期"])) return { status: "error", reason: "日期格式應為 YYYY-MM-DD" };

    // 3. Duplicate check logic: exact receipt_no OR (same donor, date, category, amount)
    if (row["單據編號"]) {
      const recNo = row["單據編號"].trim();
      const { data: matches } = await supabase.from("receipts").select("id").eq("receipt_no", recNo).limit(1);
      if (matches && matches.length > 0) return { status: "duplicate", reason: `編號 [${recNo}] 已存在` };
    }

    const { data: signatureMatches } = await supabase.from("receipts")
      .select("id")
      .eq("date", row["日期"])
      .eq("donor_name", row["姓名"])
      .eq("category", row["科目"])
      .eq("amount", amt)
      .limit(1);

    if (signatureMatches && signatureMatches.length > 0) return { status: "duplicate", reason: "已有相同收入紀錄" };

    return { status: "ready" };
  };

  const confirmImport = async (validRows: Record<string, string>[]) => {
    const now = Date.now();

    // 1. Fetch all donors to match
    const { data: allDonors } = await supabase.from("donors").select("id, name, phone");
    const normalize = (p: string | null) => p?.replace(/\D/g, "") || "";

    const donorByFullKey = new Map<string, string>(); // "name|normPhone" -> id
    const donorByNameOnly = new Map<string, string>(); // "name" -> id

    (allDonors as Donor[] | null)?.forEach(d => {
      const n = d.name.trim();
      const p = normalize(d.phone);
      if (!donorByFullKey.has(`${n}|${p}`)) donorByFullKey.set(`${n}|${p}`, d.id);
      if (!donorByNameOnly.has(n)) donorByNameOnly.set(n, d.id);
    });

    const payloads = validRows.map((row, index) => {
      const name = row["姓名"]?.trim() || "";
      const rawPhone = row["電話"]?.trim() || "";
      const normPhone = normalize(rawPhone);

      const fullMatch = donorByFullKey.get(`${name}|${normPhone}`);
      const nameMatch = donorByNameOnly.get(name);

      // Prefer full match (name+phone), fallback to name-only
      const matchedId = fullMatch || nameMatch || null;

      return {
        receipt_no: row["單據編號"]?.trim() || `REC-${now}-${index}-${Math.floor(Math.random() * 10000)}`,
        date: row["日期"],
        donor_id: matchedId,
        donor_name: name,
        phone: rawPhone || null,
        address: row["地址"]?.trim() || null,
        category: row["科目"],
        amount: parseFloat(row["金額"]),
        handler: row["經手人"]?.trim() || null,
        payment_method: row["付款方式"]?.trim() || "現金",
        status: "normal" as const,
      };
    });

    // Batch insert
    const { error } = await (supabase.from("receipts") as any).insert(payloads);
    if (error) {
      console.error("Import failed:", error);
      throw error;
    }

    // Reset state to ensure visibility
    setPage(1);
    fetchReceipts();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const normalCount = receipts.filter(r => r.status === "normal").length;
  const voidedCount = receipts.filter(r => r.status === "voided").length;
  const totalIncome = receipts.filter(r => r.status === "normal").reduce((s, r) => s + r.amount, 0);

  const handleExport = () => {
    if (receipts.length === 0) return;
    const headers = ["單據編號", "日期", "姓名", "科目", "金額", "經手人", "狀態", "付款方式", "備註"];
    const rows = receipts.map(r => [
      r.receipt_no,
      r.date,
      r.donor_name,
      r.category,
      r.amount,
      r.handler || "",
      r.status === "normal" ? "正常" : "已作廢",
      r.payment_method || "",
      r.void_reason || ""
    ]);

    const content = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `income_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* ── Header ── */}
        <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-5 flex items-center justify-between z-20">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <span>財務管理</span><ChevronRight className="w-4 h-4" /><span className="text-red-700 font-medium font-bold">收入管理</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">收入管理系統</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">管理寺廟各項收入來源、收據開立及往來對象紀錄。</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setImportOpen(true)}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              匯入資料
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              匯出資料
            </button>
            <button
              onClick={openAdd}
              className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-lg transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新增收入
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          {/* ── KPI ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "總收入（本頁）", value: `$${totalIncome.toLocaleString()}` },
              { label: "總收據數（全部）", value: total.toLocaleString() },
              { label: "正常（本頁）", value: normalCount },
              { label: "作廢（本頁）", value: voidedCount },
            ].map(k => (
              <div key={k.label} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-slate-500 text-sm font-medium">{k.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{k.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 dark:bg-slate-900/50">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">收入明細紀錄</h3>
              <div className="relative group w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-red-700 transition-colors" />
                <input
                  type="text"
                  placeholder="搜尋收入單號、姓名、科目..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-red-700/20 focus:border-red-700 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    {[
                      { label: "單據編號", key: "receipt_no" },
                      { label: "日期", key: "date" },
                      { label: "姓名", key: "donor_name" },
                      { label: "科目", key: "category" },
                      { label: "金額", key: "amount", align: "right" },
                      { label: "經手人", key: "handler" },
                      { label: "狀態", key: "status", align: "center" },
                      { label: "操作", key: null, align: "right" },
                    ].map((h) => (
                      <th
                        key={h.label}
                        onClick={() => {
                          if (!h.key) return;
                          if (sortColumn === h.key) setSortDirection(!sortDirection);
                          else { setSortColumn(h.key); setSortDirection(false); }
                        }}
                        className={cn(
                          "px-6 py-4 transition-colors",
                          h.key && "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-red-700",
                          h.align === "right" ? "text-right" : h.align === "center" ? "text-center" : ""
                        )}
                      >
                        <div className={cn("flex items-center gap-1.5", h.align === "right" ? "justify-end" : h.align === "center" ? "justify-center" : "")}>
                          {h.label}
                          {h.key && (
                            sortColumn === h.key ? (
                              sortDirection ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-20" />
                            )
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan={8} className="py-16 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />載入中...</td></tr>
                  ) : receipts.length === 0 ? (
                    <tr><td colSpan={8} className="py-16 text-center text-slate-400">查無資料</td></tr>
                  ) : receipts.map(r => {
                    const cs = CATEGORY_STYLES[r.category] ?? CATEGORY_STYLES["其他"];
                    const isVoided = r.status === "voided";
                    return (
                      <tr key={r.id} className={cn("hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer", isVoided && "opacity-60")}>
                        <td className={cn("px-5 py-3.5 font-medium", isVoided ? "text-slate-400 line-through" : "text-red-700")}
                          onClick={() => { setSelected(r); setDrawerOpen(true); }}
                        >#{r.receipt_no}</td>
                        <td className="px-5 py-3.5 text-slate-500" onClick={() => { setSelected(r); setDrawerOpen(true); }}>{r.date}</td>
                        <td className="px-5 py-3.5 font-medium" onClick={() => { setSelected(r); setDrawerOpen(true); }}>{r.donor_name}</td>
                        <td className="px-5 py-3.5">
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", cs.bg, cs.text)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", cs.dot)} />
                            {r.category}
                          </span>
                        </td>
                        <td className={cn("px-5 py-3.5 text-right font-bold tabular-nums", isVoided ? "text-slate-400 line-through" : "")}>
                          ${r.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">{r.handler ?? "-"}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={cn("inline-flex px-2 py-1 rounded text-xs font-bold",
                            isVoided ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          )}>{isVoided ? "已作廢" : "正常"}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right relative" ref={menuOpen === r.id ? menuRef : undefined}>
                          <button
                            onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === r.id ? null : r.id); }}
                            className="text-slate-400 hover:text-red-700 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {isVoided ? <Info className="w-5 h-5" /> : <MoreVertical className="w-5 h-5" />}
                          </button>
                          {menuOpen === r.id && (
                            <div className="absolute right-5 top-10 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 min-w-[140px]">
                              {!isVoided && (
                                <button onClick={() => openEdit(r)} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                                  <Pencil className="w-4 h-4" />編輯明細
                                </button>
                              )}
                              <button
                                onClick={() => { setSelected(r); setDrawerOpen(true); setMenuOpen(null); }}
                                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                              >
                                <Info className="w-4 h-4" />查看明細
                              </button>
                              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                              <button
                                onClick={() => { setDeleteTarget(r); setMenuOpen(null); }}
                                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />刪除
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-sm text-slate-500">共 <span className="font-medium text-slate-900 dark:text-white">{total}</span> 筆資料</span>
              <div className="flex items-center gap-1.5">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={cn("px-3 py-1 rounded text-sm font-medium transition-colors",
                      page === p ? "bg-red-700 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
                    )}>{p}</button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Detail Drawer ── */}
      <aside className={cn("absolute inset-y-0 right-0 w-[420px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transform transition-transform duration-300 z-30 flex flex-col",
        drawerOpen ? "translate-x-0" : "translate-x-full")}>
        {selected && (
          <>
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div><h3 className="text-lg font-bold">收據明細</h3><p className="text-sm text-slate-500">#{selected.receipt_no}</p></div>
              <div className="flex items-center gap-2">
                {selected.status === "normal" && (
                  <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <Pencil className="w-4 h-4" />編輯
                  </button>
                )}
                <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              {/* Status banner */}
              <div className={cn("flex items-center gap-3 p-4 rounded-lg border",
                selected.status === "voided" ? "bg-red-50 dark:bg-red-900/10 border-red-100" : "bg-green-50 dark:bg-green-900/10 border-green-100"
              )}>
                <div className={cn("p-2 rounded-full", selected.status === "voided" ? "bg-red-100" : "bg-green-100")}>
                  {selected.status === "voided" ? <AlertTriangle className="text-red-600 w-5 h-5" /> : <CheckCircle2 className="text-green-600 w-5 h-5" />}
                </div>
                <div>
                  <p className={cn("font-bold text-sm", selected.status === "voided" ? "text-red-800" : "text-green-800")}>
                    狀態：{selected.status === "voided" ? "已作廢" : "正常"}
                  </p>
                  {selected.void_reason && <p className="text-xs text-red-600">理由：{selected.void_reason}</p>}
                </div>
              </div>

              {/* Donor info */}
              <section>
                <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3">人員資訊</h4>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2.5">
                  {[["姓名", selected.donor_name], ["電話", selected.phone ?? "-"], ["地址", selected.address ?? "-"]].map(([l, v]) => (
                    <div key={l} className="flex justify-between">
                      <span className="text-sm text-slate-500">{l}</span>
                      <span className="text-sm font-medium text-right max-w-[220px]">{v}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Transaction detail */}
              <section>
                <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3">交易明細</h4>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2.5">
                  {[["日期", selected.date], ["科目", selected.category], ["收款人", selected.handler ?? "-"], ["付款方式", selected.payment_method ?? "-"]].map(([l, v]) => (
                    <div key={l} className="flex justify-between">
                      <span className="text-sm text-slate-500">{l}</span>
                      <span className="text-sm font-medium">{v}</span>
                    </div>
                  ))}
                  <div className="h-px bg-slate-200 dark:bg-slate-700" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700">總金額</span>
                    <span className="text-xl font-bold text-red-700">${selected.amount.toLocaleString()}</span>
                  </div>
                </div>
              </section>

              {/* Void zone */}
              {selected.status === "normal" && (
                <section className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-red-600 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />危險區域
                  </h4>
                  <div className="p-4 rounded-lg border border-red-100 bg-red-50 dark:bg-red-900/10">
                    <p className="text-sm text-slate-500 mb-3">作廢此收據無法復原，請填寫理由。</p>
                    <textarea
                      className="w-full text-sm p-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      placeholder="輸入理由（例如：資料輸入錯誤）"
                      rows={2}
                      value={voidReason}
                      onChange={e => setVoidReason(e.target.value)}
                    />
                    <button
                      onClick={handleVoid}
                      disabled={voidLoading || !voidReason.trim()}
                      className="mt-2 w-full py-2 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
                    >
                      {voidLoading ? "處理中..." : "確認作廢收據"}
                    </button>
                  </div>
                </section>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-3 bg-slate-50 dark:bg-slate-900">
              <button className="flex-1 py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors">列印收據</button>
              {selected.status === "normal" && (
                <button onClick={() => openEdit(selected)} className="flex-1 py-2.5 px-4 bg-red-700 text-white font-bold text-sm rounded-lg hover:bg-red-800 transition-colors">
                  編輯明細
                </button>
              )}
            </div>
          </>
        )}
      </aside>

      {/* ── Add/Edit Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? "編輯收入記錄" : "新增收入記錄"}
        subtitle={editTarget ? `修改單據 #${editTarget.receipt_no}` : "填寫收入詳細資訊"}
        width="max-w-xl"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="單據編號">
              <input
                className={inputCls}
                placeholder="留空自動產生"
                value={form.receipt_no}
                onChange={(e) => setForm({ ...form, receipt_no: e.target.value })}
              />
            </Field>
            <Field label="日期" required>
              <input type="date" className={inputCls} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </Field>
          </div>
          <Field label="姓名" required>
            <div className="relative">
              <input
                className={inputCls}
                placeholder="王小明"
                value={form.donor_name}
                onChange={e => {
                  setForm(f => ({ ...f, donor_name: e.target.value, donor_id: null }));
                  fetchDonorSuggestions(e.target.value);
                }}
                onFocus={() => { if (donorSuggestions.length > 0) setShowSuggestions(true); }}
              />
              {showSuggestions && (
                <div ref={suggestionRef} className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  {donorSuggestions.map(d => (
                    <button
                      key={d.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex flex-col"
                      onClick={() => {
                        setForm(f => ({
                          ...f,
                          donor_id: d.id,
                          donor_name: d.name,
                          phone: d.phone || f.phone,
                          address: d.address || f.address,
                        }));
                        setShowSuggestions(false);
                      }}
                    >
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{d.name}</span>
                      {d.phone && <span className="text-xs text-slate-500">{d.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="電話">
              <input className={inputCls} placeholder="0912-345-678" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </Field>
            <Field label="付款方式">
              <select className={inputCls} value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                <option value="">選擇付款方式</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </div>
          <Field label="地址">
            <input className={inputCls} placeholder="台北市中山路123號" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="科目/種類" required>
              <select className={inputCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">選擇科目</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="金額（元）" required>
              <input type="number" min="1" className={inputCls} placeholder="1200" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </Field>
          </div>
          <Field label="經手人/收款人">
            <input className={inputCls} placeholder="蔡先生" value={form.handler} onChange={e => setForm(f => ({ ...f, handler: e.target.value }))} />
          </Field>

          {formError && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{formError}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 px-4 border border-slate-200 dark:border-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              取消
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 px-4 bg-red-700 hover:bg-red-800 disabled:opacity-60 text-white font-bold text-sm rounded-lg transition-colors">
              {saving ? "儲存中..." : editTarget ? "儲存變更" : "確認新增"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="確認刪除記錄" width="max-w-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <Trash2 className="w-5 h-5 text-red-600 flex-none" />
            <p className="text-sm text-slate-700 dark:text-slate-300">
              確定要刪除 <strong>#{deleteTarget?.receipt_no}</strong>（{deleteTarget?.donor_name}）的記錄嗎？此動作無法復原。
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              取消
            </button>
            <button onClick={handleDelete} disabled={deleteLoading}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-sm rounded-lg transition-colors">
              {deleteLoading ? "刪除中..." : "確認刪除"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Import Modal ── */}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="匯入收入資料"
        expectedHeaders={["單據編號", "日期", "姓名", "電話", "地址", "科目", "金額", "經手人", "付款方式"]}
        onValidateRow={validateImportRow}
        onConfirmImport={confirmImport}
        sampleCsvUrl="/templates/income_template.csv"
      />
    </div>
  );
}
