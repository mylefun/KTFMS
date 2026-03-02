import { Sidebar } from "@/components/Sidebar";
import { Modal } from "@/components/Modal";
import {
  ChevronRight, Search, Bell, Plus, Landmark, Wallet, Lock,
  PiggyBank, TrendingUp, Minus, Sun, Flame, Filter, Download,
  MoreHorizontal, Loader2, Trash2, Pencil, Info,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Transaction, Receipt } from "@/types/database";
import { cn } from "@/utils/cn";

// ─── Constants ──────────────────────────────────────────
const CATEGORIES = ["光明燈", "平安燈", "其他收入", "法會收入", "水電費", "活動支出", "修繕", "人事薪資", "其他"];
const CATEGORY_BADGE: Record<string, string> = {
  "光明燈": "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  "平安燈": "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  "其他收入": "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  "法會收入": "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
};
const inputCls = "w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-600/30 focus:border-red-600 outline-none transition-all";

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

const emptyTxn = () => ({
  txn_no: "",
  date: new Date().toISOString().split("T")[0],
  description: "",
  category: "光明燈",
  type: "income" as "income" | "expense",
  amount: "",
  status: "completed" as "completed" | "pending",
});

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTrx, setTotalTrx] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears] = useState(() => {
    const current = new Date().getFullYear();
    const years = [];
    for (let y = current + 1; y >= 2024; y--) years.push(y);
    return years;
  });

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [form, setForm] = useState(emptyTxn());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // stats
  const [stats, setStats] = useState({
    totalAssets: 0,
    annualSurplus: 0,
    monthlyData: [] as { month: string; income: number; expense: number }[],
    projects: {
      guangming: 0,
      pingan: 0,
      repair: 0,
    }
  });

  // delete
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // action menu
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const fetchStats = async () => {
    // 1. Total Assets (Combined transactions and receipts)
    const [{ data: tData }, { data: rData }] = await Promise.all([
      supabase.from("transactions").select("amount").eq("status", "completed"),
      supabase.from("receipts").select("amount").eq("status", "normal")
    ]);

    const txnSum = (tData as { amount: number }[] ?? []).reduce((sum, t) => sum + t.amount, 0);
    const receiptSum = (rData as { amount: number }[] ?? []).reduce((sum, r) => sum + r.amount, 0);
    const totalAssets = txnSum + receiptSum;

    // 2. Annual Data (Filtered by selected year)
    const [{ data: yearTxn }, { data: yearReceipt }] = await Promise.all([
      supabase.from("transactions").select("*").eq("status", "completed").gte("date", `${selectedYear}-01-01`).lte("date", `${selectedYear}-12-31`),
      supabase.from("receipts").select("*").eq("status", "normal").gte("date", `${selectedYear}-01-01`).lte("date", `${selectedYear}-12-31`)
    ]);

    const typedYearTxn = (yearTxn as Transaction[] ?? []);
    const typedYearReceipt = (yearReceipt as Receipt[] ?? []);

    // 3. Annual Surplus
    // Income from receipts + Income from transactions - Expenses from transactions
    // Actually receipts are always income (+). Transactions can be both.
    const annualIncome = typedYearReceipt.reduce((sum, r) => sum + r.amount, 0) +
      typedYearTxn.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const annualExpense = Math.abs(typedYearTxn.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
    const annualSurplus = annualIncome - annualExpense;

    // 4. Monthly Data
    const months = [];
    for (let i = 1; i <= 12; i++) {
      const mStr = `${selectedYear}-${String(i).padStart(2, "0")}`;
      const mLabel = `${i}月`;

      const mReceipts = typedYearReceipt.filter(r => r.date.startsWith(mStr));
      const mTxns = typedYearTxn.filter(t => t.date.startsWith(mStr));

      const income = mReceipts.reduce((sum, r) => sum + r.amount, 0) +
        mTxns.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
      const expense = Math.abs(mTxns.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));

      months.push({ month: mLabel, income, expense });
    }

    // 5. Projects (Annual) - Combining both if needed, but usually categories match
    const guangming = typedYearReceipt.filter(r => r.category === "光明燈").reduce((sum, r) => sum + r.amount, 0) +
      typedYearTxn.filter(t => t.category === "光明燈" && t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const pingan = typedYearReceipt.filter(r => r.category === "平安燈").reduce((sum, r) => sum + r.amount, 0) +
      typedYearTxn.filter(t => t.category === "平安燈" && t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const repair = typedYearTxn.filter(t => t.category === "修繕").reduce((sum, t) => sum + Math.abs(t.amount), 0);

    setStats({
      totalAssets,
      annualSurplus,
      monthlyData: months,
      projects: { guangming, pingan, repair }
    });
  };

  const fetchTxn = async () => {
    setLoading(true);
    let q = supabase.from("transactions").select("*", { count: "exact" })
      .gte("date", `${selectedYear}-01-01`)
      .lte("date", `${selectedYear}-12-31`)
      .order("date", { ascending: false }).limit(20);

    if (search.trim()) q = q.or(`description.ilike.%${search}%,category.ilike.%${search}%`);
    const { data, count, error } = await q;
    if (!error) { setTransactions(data ?? []); setTotalTrx(count ?? 0); }
    setLoading(false);
    fetchStats();
  };

  useEffect(() => { fetchTxn(); }, [search, selectedYear]);

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyTxn());
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditTarget(t);
    setForm({
      txn_no: t.txn_no,
      date: t.date,
      description: t.description,
      category: t.category,
      type: t.amount >= 0 ? "income" : "expense",
      amount: String(Math.abs(t.amount)),
      status: t.status,
    });
    setFormError("");
    setModalOpen(true);
    setMenuOpen(null);
  };

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount || !form.category) {
      setFormError("請填寫必填欄位：說明、科目、金額"); return;
    }
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) { setFormError("金額必須為正數"); return; }
    setSaving(true); setFormError("");

    const payload: any = {
      txn_no: form.txn_no.trim() || `TRX-${Date.now()}`,
      date: form.date,
      description: form.description.trim(),
      category: form.category,
      amount: form.type === "income" ? amt : -amt,
      status: form.status,
    };

    const { error } = editTarget
      ? await (supabase.from("transactions") as any).update(payload).eq("id", editTarget.id)
      : await (supabase.from("transactions") as any).insert(payload);

    if (error) { setFormError(error.message); setSaving(false); return; }
    setModalOpen(false);
    fetchTxn();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await supabase.from("transactions").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null); fetchTxn(); setDeleteLoading(false);
  };

  return (
    <div className="relative flex h-screen w-full flex-row overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 sticky top-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <span>儀表板</span><ChevronRight className="w-4 h-4" /><span className="text-slate-900 dark:text-white font-medium">總覽</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">財務總覽</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 inset-y-0 my-auto w-5 h-5 text-slate-400" />
              <input
                className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm placeholder-slate-500 focus:ring-2 focus:ring-red-700 w-64 transition-all outline-none"
                placeholder="搜尋交易..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500 hidden sm:block">年度:</span>
              <select
                className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-red-700 transition-all outline-none"
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
              >
                {availableYears.map(y => <option key={y} value={y}>{y} 年度</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border border-white" />
              </button>
              <button onClick={openAdd} className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4" /><span>新增記錄</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-10">

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "總資產", value: `$${stats.totalAssets.toLocaleString()}`, change: "即時更新", icon: <Landmark className="w-8 h-8 text-red-700 bg-red-700/10 p-1.5 rounded-lg" />, color: "text-emerald-600" },
                { label: "活期存款", value: `$${(stats.totalAssets * 0.4).toLocaleString()}`, change: "估算值 (40%)", icon: <Wallet className="w-8 h-8 text-red-700 bg-red-700/10 p-1.5 rounded-lg" />, color: "text-emerald-600" },
                { label: "定期存款", value: `$${(stats.totalAssets * 0.6).toLocaleString()}`, change: "估算值 (60%)", icon: <Lock className="w-8 h-8 text-red-700 bg-red-700/10 p-1.5 rounded-lg" />, color: "text-slate-500" },
                { label: "年度累計盈餘", value: `$${stats.annualSurplus.toLocaleString()}`, change: `${selectedYear} 年度`, icon: <PiggyBank className="w-8 h-8 text-red-700 bg-red-700/10 p-1.5 rounded-lg" />, color: "text-emerald-600" },
              ].map(k => (
                <div key={k.label} className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between"><span className="text-slate-500 text-sm font-medium">{k.label}</span>{k.icon}</div>
                  <div>
                    <h3 className="text-2xl font-bold">{k.value}</h3>
                    <p className={`${k.color} text-sm font-medium flex items-center gap-1 mt-1`}>
                      <TrendingUp className="w-4 h-4" />{k.change}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Bar Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <div>
                    <h3 className="text-lg font-bold">收支對比圖</h3>
                    <p className="text-sm text-slate-500">本財年每月收支明細</p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start">
                    <button className="px-3 py-1.5 text-xs font-semibold rounded bg-white dark:bg-slate-700 shadow-sm">{selectedYear} 全年</button>
                    <span className="px-3 py-1.5 text-xs font-medium text-slate-400">月度分析</span>
                  </div>
                </div>
                <div className="flex-1 flex items-end justify-between gap-2 h-64 w-full mt-4 px-2">
                  {stats.monthlyData.map(d => {
                    const max = Math.max(...stats.monthlyData.map(m => Math.max(m.income, m.expense, 100)));
                    const incPct = (d.income / max) * 100;
                    const expPct = (d.expense / max) * 100;
                    return (
                      <div key={d.month} className="flex flex-col items-center gap-2 group w-full h-full justify-end relative">
                        <div className="relative w-full max-w-[40px] flex items-end h-full gap-1">
                          <div className="w-1/2 bg-emerald-500 rounded-t-sm opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer" style={{ height: `${incPct}%` }} />
                          <div className="w-1/2 bg-amber-500 rounded-t-sm opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer" style={{ height: `${expPct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-slate-400 group-hover:text-slate-600">{d.month}</span>

                        {/* Custom Tooltip */}
                        <div className="absolute bottom-full left-1/2 -ms-20 mb-2 w-40 bg-slate-900 text-white p-3 rounded-lg text-xs shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                          <div className="font-bold border-b border-slate-700 pb-1.5 mb-1.5 flex justify-between items-center">
                            <span>{selectedYear} {d.month}</span>
                            <Info className="w-3 h-3 text-slate-400" />
                          </div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-slate-400">收入:</span>
                            <span className="text-emerald-400 font-bold">${d.income.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">支出:</span>
                            <span className="text-amber-400 font-bold">${d.expense.toLocaleString()}</span>
                          </div>
                          <div className="absolute bottom-[-6px] left-1/2 -ml-1 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-6 mt-6">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-xs font-medium text-slate-600 dark:text-slate-300">收入</span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-xs font-medium text-slate-600 dark:text-slate-300">支出</span></div>
                </div>
              </div>

              {/* Lighting Projects */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">點燈專案</h3>
                  <button className="text-red-700 hover:text-red-800 text-sm font-semibold">查看全部</button>
                </div>
                <div className="flex flex-col gap-6">
                  {[
                    { name: "光明燈", icon: <Sun className="w-5 h-5" />, iconBg: "bg-amber-100 dark:bg-amber-900/30 text-amber-600", target: 50000, actual: stats.projects.guangming, bar: "from-amber-400 to-amber-600" },
                    { name: "平安燈", icon: <Flame className="w-5 h-5" />, iconBg: "bg-red-100 dark:bg-red-900/30 text-red-600", target: 30000, actual: stats.projects.pingan, bar: "from-red-400 to-red-600" },
                    { name: "修繕基金", icon: <Landmark className="w-5 h-5" />, iconBg: "bg-red-700/10 text-red-700", target: 200000, actual: stats.projects.repair, bar: "from-red-700 to-red-800" },
                  ].map(p => {
                    const pct = Math.min(Math.round((p.actual / p.target) * 100), 100);
                    return (
                      <div key={p.name} className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`${p.iconBg} p-2 rounded-lg`}>{p.icon}</div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold">{p.name}</h4>
                            <div className="flex justify-between items-center">
                              <p className="text-xs text-slate-500">目標: ${p.target.toLocaleString()}</p>
                              <p className="text-xs font-medium text-slate-400">${p.actual.toLocaleString()}</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                          <div className={`bg-gradient-to-r ${p.bar} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>專案募得總額</span><span className="font-bold text-slate-900 dark:text-white text-sm">${(stats.projects.guangming + stats.projects.pingan + stats.projects.repair).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold">近期活動</h3>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"><Filter className="w-4 h-4" />篩選</button>
                  <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"><Download className="w-4 h-4" />匯出</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium">
                    <tr>
                      {["交易編號", "日期", "描述", "類別", "金額", "狀態", "操作"].map(h => (
                        <th key={h} className={cn("px-6 py-4", h === "操作" ? "text-right" : "")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                      <tr><td colSpan={7} className="py-12 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />載入中...</td></tr>
                    ) : transactions.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-slate-400">查無資料</td></tr>
                    ) : transactions.map(t => {
                      const isIncome = t.amount >= 0;
                      const badge = CATEGORY_BADGE[t.category] ?? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
                      const stStyle = t.status === "completed"
                        ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                        : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400";
                      const stDot = t.status === "completed" ? "bg-emerald-500" : "bg-amber-500 animate-pulse";
                      return (
                        <tr key={t.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-slate-500 text-xs">#{t.txn_no}</td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{t.date}</td>
                          <td className="px-6 py-4 font-medium">{t.description}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${badge}`}>{t.category}</span>
                          </td>
                          <td className={`px-6 py-4 font-bold ${isIncome ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                            {isIncome ? "+" : ""}${Math.abs(t.amount).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${stStyle} text-xs font-medium`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${stDot}`} />
                              {t.status === "completed" ? "已完成" : "待處理"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right relative" ref={menuOpen === t.id ? menuRef : undefined}>
                            <button
                              onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === t.id ? null : t.id); }}
                              className="text-slate-400 hover:text-red-700 transition-colors"
                            >
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                            {menuOpen === t.id && (
                              <div className="absolute right-5 top-10 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 min-w-[130px]">
                                <button onClick={() => openEdit(t)} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                                  <Pencil className="w-4 h-4" />編輯
                                </button>
                                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                                <button onClick={() => { setDeleteTarget(t); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600">
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
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500">
                <span>顯示 {totalTrx} 筆中的 {transactions.length} 筆</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Add/Edit Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editTarget ? "編輯記錄" : "新增記錄"}
        subtitle={editTarget ? `修改 #${editTarget.txn_no}` : "填寫收支記錄資訊"}
        width="max-w-lg"
      >
        <div className="flex flex-col gap-4">
          {/* Income / Expense toggle */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setForm(f => ({ ...f, type: "income" }))}
              className={cn("flex-1 py-2.5 text-sm font-bold transition-colors",
                form.type === "income" ? "bg-emerald-500 text-white" : "bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900"
              )}
            >📥 收入</button>
            <button
              onClick={() => setForm(f => ({ ...f, type: "expense" }))}
              className={cn("flex-1 py-2.5 text-sm font-bold transition-colors",
                form.type === "expense" ? "bg-red-600 text-white" : "bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900"
              )}
            >📤 支出</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="交易編號">
              <input className={inputCls} placeholder="留空自動產生" value={form.txn_no} onChange={e => setForm(f => ({ ...f, txn_no: e.target.value }))} />
            </Field>
            <Field label="日期" required>
              <input type="date" className={inputCls} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </Field>
          </div>
          <Field label="描述說明" required>
            <input className={inputCls} placeholder="捐款 - 王先生" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="類別" required>
              <select className={inputCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="金額（元）" required>
              <input type="number" min="0.01" step="0.01" className={inputCls} placeholder="1200" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </Field>
          </div>
          <Field label="狀態">
            <select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as "completed" | "pending" }))}>
              <option value="completed">已完成</option>
              <option value="pending">待處理</option>
            </select>
          </Field>

          {formError && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{formError}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">取消</button>
            <button onClick={handleSave} disabled={saving}
              className={cn("flex-1 py-2.5 text-white font-bold text-sm rounded-lg transition-colors disabled:opacity-60",
                form.type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-700 hover:bg-red-800"
              )}
            >{saving ? "儲存中..." : editTarget ? "儲存變更" : "新增記錄"}</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="確認刪除記錄" width="max-w-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <Trash2 className="w-5 h-5 text-red-600 flex-none mt-0.5" />
            <p className="text-sm text-slate-700 dark:text-slate-300">
              確定要刪除 <strong>{deleteTarget?.description}</strong>（#{deleteTarget?.txn_no}）嗎？此動作無法復原。
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">取消</button>
            <button onClick={handleDelete} disabled={deleteLoading}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-sm rounded-lg transition-colors">
              {deleteLoading ? "刪除中..." : "確認刪除"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
