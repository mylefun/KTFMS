import { Sidebar } from "@/components/Sidebar";
import { Modal } from "@/components/Modal";
import { ImportModal, ImportRowStatus } from "@/components/ImportModal";
import {
  Download, Plus, Search, Calendar, ChevronDown, Upload,
  MoreVertical, Info, X, CheckCircle2, AlertTriangle,
  ChevronLeft, ChevronRight, Loader2, Pencil, Trash2,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/utils/cn";
import { supabase } from "@/lib/supabase";
import type { Receipt } from "@/types/database";

// ─── Constants ───────────────────────────────────────────────
const CATEGORIES = ["光明燈", "平安燈", "一般捐款", "法會收入", "其他"];
const PAYMENT_METHODS = ["現金", "轉帳", "匯款", "其他"];
const CATEGORY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  "光明燈": { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  "平安燈": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  "一般捐款": { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  "法會收入": { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  "其他": { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
};
const FILTER_TABS = ["所有收據", ...CATEGORIES, "已作廢"];
const PAGE_SIZE = 10;

// ─── Form default ────────────────────────────────────────────
const emptyForm = () => ({
  receipt_no: "",
  date: new Date().toISOString().split("T")[0],
  donor_name: "",
  phone: "",
  address: "",
  category: "光明燈",
  amount: "",
  handler: "",
  payment_method: "現金",
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
  // list state
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState("所有收據");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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
      .order("date", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (activeTab === "已作廢") q = q.eq("status", "voided");
    else if (activeTab !== "所有收據") q = q.eq("category", activeTab).eq("status", "normal");

    if (search.trim()) q = q.or(`receipt_no.ilike.%${search}%,donor_name.ilike.%${search}%`);

    const { data, count, error } = await q;
    if (!error) { setReceipts(data ?? []); setTotal(count ?? 0); }
    setLoading(false);
  }, [activeTab, search, page]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  // ── open add modal ─────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setFormError("");
    setModalOpen(true);
  };

  // ── open edit modal ────────────────────────────────────────
  const openEdit = (r: Receipt) => {
    setEditTarget(r);
    setForm({
      receipt_no: r.receipt_no,
      date: r.date,
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
      setFormError("請填寫必填欄位：捐款人姓名、科目、金額"); return;
    }
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) { setFormError("金額必須為正數"); return; }

    setSaving(true); setFormError("");
    const payload = {
      receipt_no: form.receipt_no.trim() || `REC-${Date.now()}`,
      date: form.date,
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
      ? await supabase.from("receipts").update(payload).eq("id", editTarget.id)
      : await supabase.from("receipts").insert(payload);

    if (error) { setFormError(error.message); setSaving(false); return; }
    setModalOpen(false);
    fetchReceipts();
    setSaving(false);
  };

  // ── void ───────────────────────────────────────────────────
  const handleVoid = async () => {
    if (!selected || !voidReason.trim()) return;
    setVoidLoading(true);
    await supabase.from("receipts").update({ status: "voided", void_reason: voidReason }).eq("id", selected.id);
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
    if (!row["捐款人"] || !row["科目"] || !row["金額"] || !row["日期"]) {
      return { status: "error", reason: "缺少必填欄位 (捐款人/科目/金額/日期)" };
    }
    const amt = parseFloat(row["金額"]);
    if (isNaN(amt) || amt <= 0) return { status: "error", reason: "金額格式錯誤" };

    // 2. Format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(row["日期"])) return { status: "error", reason: "日期格式應為 YYYY-MM-DD" };

    // 3. Duplicate check logic: exact receipt_no OR (same donor, date, category, amount)
    let q = supabase.from("receipts").select("id").limit(1);

    if (row["收據序號"]) {
      const recNoMatches = await supabase.from("receipts").select("id").eq("receipt_no", row["收據序號"]).limit(1);
      if (recNoMatches.data && recNoMatches.data.length > 0) return { status: "duplicate", reason: "已有相同收據序號" };
    }

    q = q.eq("date", row["日期"])
      .eq("donor_name", row["捐款人"])
      .eq("category", row["科目"])
      .eq("amount", amt);

    const { data } = await q;
    if (data && data.length > 0) return { status: "duplicate", reason: "已有相同捐款紀錄" };

    return { status: "ready" };
  };

  const confirmImport = async (validRows: Record<string, string>[]) => {
    const payloads = validRows.map(row => ({
      receipt_no: row["收據序號"]?.trim() || `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: row["日期"],
      donor_name: row["捐款人"]?.trim(),
      phone: row["電話"]?.trim() || null,
      address: row["地址"]?.trim() || null,
      category: row["科目"],
      amount: parseFloat(row["金額"]),
      handler: row["經手人"]?.trim() || null,
      payment_method: row["付款方式"]?.trim() || "現金",
      status: "normal" as const,
    }));

    // Batch insert
    await supabase.from("receipts").insert(payloads);
    fetchReceipts();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const normalCount = receipts.filter(r => r.status === "normal").length;
  const voidedCount = receipts.filter(r => r.status === "voided").length;
  const totalIncome = receipts.filter(r => r.status === "normal").reduce((s, r) => s + r.amount, 0);

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* ── Header ── */}
        <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-5 flex items-center justify-between z-20">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">收入與收據管理</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">管理捐款、追蹤收據紀錄及處理作廢事宜。</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors"
            >
              <Upload className="w-5 h-5" />匯入資料
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors">
              <Download className="w-5 h-5" />匯出資料
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-sm shadow-sm transition-colors"
            >
              <Plus className="w-5 h-5" />新增收據
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

          {/* ── Filters ── */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
            <div className="relative group w-full xl:w-80">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400 group-focus-within:text-red-700 transition-colors" />
              <input
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-red-700/20 focus:border-red-700 transition-all text-sm outline-none"
                placeholder="搜尋收據序號或捐款人姓名..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto max-w-full gap-0.5">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setPage(1); }}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
                    activeTab === tab
                      ? "bg-white dark:bg-slate-700 shadow-sm text-red-700 font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >{tab}</button>
              ))}
            </div>
          </div>

          {/* ── Table ── */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    {["收據序號", "日期", "捐款人", "科目", "金額", "收款人", "狀態", "操作"].map((h, i) => (
                      <th key={h} className={cn("px-5 py-4 font-semibold whitespace-nowrap", (i === 4 || i === 7) ? "text-right" : i === 6 ? "text-center" : "")}>{h}</th>
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
                <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3">捐款人資訊</h4>
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
        title={editTarget ? "編輯收據" : "新增收據"}
        subtitle={editTarget ? `修改 #${editTarget.receipt_no}` : "填寫以下欄位以新增收據"}
        width="max-w-xl"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="收據序號">
              <input className={inputCls} placeholder="留空自動產生" value={form.receipt_no} onChange={e => setForm(f => ({ ...f, receipt_no: e.target.value }))} />
            </Field>
            <Field label="日期" required>
              <input type="date" className={inputCls} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </Field>
          </div>
          <Field label="捐款人姓名" required>
            <input className={inputCls} placeholder="王小明" value={form.donor_name} onChange={e => setForm(f => ({ ...f, donor_name: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="電話">
              <input className={inputCls} placeholder="0912-345-678" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </Field>
            <Field label="付款方式">
              <select className={inputCls} value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
          </div>
          <Field label="地址">
            <input className={inputCls} placeholder="台北市中山路123號" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="科目/種類" required>
              <select className={inputCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
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
              {saving ? "儲存中..." : editTarget ? "儲存變更" : "新增收據"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="確認刪除收據" width="max-w-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <Trash2 className="w-5 h-5 text-red-600 flex-none" />
            <p className="text-sm text-slate-700 dark:text-slate-300">
              確定要刪除 <strong>#{deleteTarget?.receipt_no}</strong>（{deleteTarget?.donor_name}）的收據嗎？此動作無法復原。
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
        title="匯入收據資料"
        expectedHeaders={["收據序號", "日期", "捐款人", "電話", "地址", "科目", "金額", "經手人", "付款方式"]}
        onValidateRow={validateImportRow}
        onConfirmImport={confirmImport}
      />
    </div>
  );
}
