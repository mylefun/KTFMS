import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Modal } from "@/components/Modal";
import {
  ChevronRight, Calendar, Download, FileText, Wallet, Banknote,
  TrendingDown, PieChart, Plus, Pencil, Trash2, Loader2, Search, Bell,
  ChevronLeft, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { BudgetAccount } from "@/types/database";
import { cn } from "@/utils/cn";
import { useAuth } from "@/contexts/AuthContext";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const inputCls = "w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 outline-none transition-all";

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

function calcPct(actual: number, budget: number) {
  if (budget <= 0) return 0;
  return Math.round((actual / budget) * 100);
}

function BarCell({ actual, budget, type }: { actual: number; budget: number; type: string }) {
  const pct = calcPct(actual, budget);
  const over = type === "expense" && pct > 100;
  const barColor = over ? "bg-red-500" : type === "income" ? (pct >= 90 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-400") : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={cn("text-xs w-10 text-right tabular-nums", over ? "text-red-600 font-bold" : "text-slate-500")}>{pct}%</span>
    </div>
  );
}

function StatusCell({ actual, budget, type }: { actual: number; budget: number; type: string }) {
  const pct = calcPct(actual, budget);
  if (type === "expense") {
    return pct > 100
      ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">超出預算</span>
      : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">低於預算</span>;
  } else {
    if (pct >= 90) return <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">正常</span>;
    if (pct >= 70) return <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">差異</span>;
    return <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">落後</span>;
  }
}

const emptyForm = (year: number, month: number) => ({
  account_type: "income" as "income" | "expense",
  account_name: "",
  budget_amount: "",
  planning_type: "yearly" as "yearly" | "monthly",
  year: year,
  month: month,
});

export default function Budget() {
  const { profile: currentProfile } = useAuth();
  const isAdmin = currentProfile?.role === "admin";

  const [accounts, setAccounts] = useState<BudgetAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [search, setSearch] = useState("");

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetAccount | null>(null);
  const [form, setForm] = useState(emptyForm(selectedYear, selectedMonth));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // delete
  const [deleteTarget, setDeleteTarget] = useState<BudgetAccount | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchBudget = async () => {
    setLoading(true);
    // 1. Fetch budget targets (Both yearly and specific monthly)
    let q = supabase.from("budget_accounts").select("*")
      .eq("year", selectedYear)
      .order("account_type")
      .order("account_name");

    // In monthly view, we want BOTH yearly budgets (to divide by 12) and specific monthly overrides
    if (viewMode === "monthly") {
      q = q.or(`month.is.null,month.eq.${selectedMonth}`);
    } else {
      q = q.is("month", null);
    }

    const { data: budgetData } = await q;

    // 2. Fetch actuals (Receipts for Income, Transactions for Expense)
    const startDate = viewMode === "monthly"
      ? `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
      : `${selectedYear}-01-01`;
    const endDate = viewMode === "monthly"
      ? new Date(selectedYear, selectedMonth, 0).toISOString().split("T")[0]
      : `${selectedYear}-12-31`;

    const [incomeRes, expenseRes] = await Promise.all([
      supabase.from("receipts").select("category, amount").eq("status", "normal").gte("date", startDate).lte("date", endDate),
      supabase.from("transactions").select("category, amount").eq("status", "completed").lt("amount", 0).gte("date", startDate).lte("date", endDate)
    ]);

    const incomeMap = new Map<string, number>();
    (incomeRes.data as { category: string, amount: number }[] | null)?.forEach(r => incomeMap.set(r.category, (incomeMap.get(r.category) || 0) + r.amount));

    const expenseMap = new Map<string, number>();
    (expenseRes.data as { category: string, amount: number }[] | null)?.forEach(t => expenseMap.set(t.category, (expenseMap.get(t.category) || 0) + Math.abs(t.amount)));

    // 3. Merge and derive monthly targets
    const merged = (budgetData ?? []).map(a => {
      let displayBudget = a.budget_amount;

      // If we are in monthly view and this is a YEARLY budget account, divide by 12
      if (viewMode === "monthly" && a.month === null) {
        displayBudget = Math.round(a.budget_amount / 12);
      }

      return {
        ...a,
        budget_amount: displayBudget,
        actual_amount: a.account_type === "income"
          ? (incomeMap.get(a.account_name) || 0)
          : (expenseMap.get(a.account_name) || 0)
      };
    });

    setAccounts(merged);
    setLoading(false);
  };

  useEffect(() => { fetchBudget(); }, [selectedYear, selectedMonth, viewMode]);

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm(selectedYear, selectedMonth));
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (a: BudgetAccount) => {
    setEditTarget(a);
    setForm({
      account_type: a.account_type,
      account_name: a.account_name,
      budget_amount: String(a.budget_amount),
      planning_type: a.month === null ? "yearly" : "monthly",
      year: a.year,
      month: a.month || selectedMonth,
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.account_name.trim() || !form.budget_amount) {
      setFormError("請填寫科目名稱與預算金額"); return;
    }
    const budget = parseFloat(form.budget_amount);
    if (isNaN(budget) || budget < 0) { setFormError("預算金額必須為正數"); return; }
    setSaving(true); setFormError("");

    const payload = {
      year: form.year,
      month: form.planning_type === "monthly" ? form.month : null,
      account_type: form.account_type,
      account_name: form.account_name.trim(),
      budget_amount: budget,
    } as any;

    const { error } = editTarget
      ? await (supabase.from("budget_accounts") as any).update(payload).eq("id", editTarget.id)
      : await (supabase.from("budget_accounts") as any).insert(payload);

    if (error) { setFormError(error.message); setSaving(false); return; }
    setModalOpen(false);
    fetchBudget();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await supabase.from("budget_accounts").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null); fetchBudget(); setDeleteLoading(false);
  };

  const filteredAccounts = accounts.filter(a => a.account_name.toLowerCase().includes(search.toLowerCase()));

  const incomes = filteredAccounts.filter(a => a.account_type === "income");
  const expenses = filteredAccounts.filter(a => a.account_type === "expense");
  const totalIncomeBudget = incomes.reduce((s, a) => s + a.budget_amount, 0);
  const totalIncomeActual = incomes.reduce((s, a) => s + a.actual_amount, 0);
  const totalExpenseBudget = expenses.reduce((s, a) => s + a.budget_amount, 0);
  const totalExpenseActual = expenses.reduce((s, a) => s + a.actual_amount, 0);
  const totalBudget = totalIncomeBudget + totalExpenseBudget;
  const totalActual = totalIncomeActual + totalExpenseActual;
  const achievement = totalBudget > 0 ? Math.round(totalActual / totalBudget * 100) : 0;

  const rowCls = "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors";

  const SectionHeader = ({ type, budgetTotal, actualTotal }: { type: "income" | "expense"; budgetTotal: number; actualTotal: number }) => {
    const diff = type === "income" ? actualTotal - budgetTotal : budgetTotal - actualTotal;
    const barPct = calcPct(actualTotal, budgetTotal);
    return (
      <tr className="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700">
        <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">
          <div className="flex items-center gap-2">
            <ChevronRightIcon className="w-4 h-4" />
            {type === "income" ? "收入" : "支出"}
          </div>
        </td>
        <td className="px-6 py-4 text-right font-medium opacity-60">${budgetTotal.toLocaleString()}</td>
        <td className="px-6 py-4 text-right font-bold">${actualTotal.toLocaleString()}</td>
        <td className={cn("px-6 py-4 text-right font-medium", diff >= 0 ? "text-green-600" : "text-red-500")}>
          {diff >= 0 ? "+" : ""}${diff.toLocaleString()}
        </td>
        <td className="px-6 py-4"><BarCell actual={actualTotal} budget={budgetTotal} type={type} /></td>
        <td className="px-6 py-4 text-center"><StatusCell actual={actualTotal} budget={budgetTotal} type={type} /></td>
        <td className="px-6 py-4" />
      </tr>
    );
  };

  return (
    <div className="relative flex h-screen w-full flex-row overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 sticky top-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <span>財務報表</span><ChevronRight className="w-4 h-4" /><span className="text-blue-600 font-medium font-bold">預算與決算</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">預算與決算報表</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 inset-y-0 my-auto w-5 h-5 text-slate-400" />
              <input
                className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm placeholder-slate-500 focus:ring-2 focus:ring-blue-600 w-64 transition-all outline-none"
                placeholder="搜尋科目..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500 border border-white" />
              </button>
              {isAdmin && (
                <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition-colors">
                  <Plus className="w-4 h-4" /><span>新增科目</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-10">

            {/* Filter Section */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex">
                  <button onClick={() => setViewMode("monthly")} className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", viewMode === "monthly" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-900")}>月結算</button>
                  <button onClick={() => setViewMode("yearly")} className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", viewMode === "yearly" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-900")}>年度決算</button>
                </div>
                <div className="flex gap-2">
                  <select className="bg-slate-100 dark:bg-slate-800 border-none py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/50 text-sm font-medium cursor-pointer"
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}>
                    {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map(y => (
                      <option key={y} value={y}>{y}年度</option>
                    ))}
                  </select>
                  {viewMode === "monthly" && (
                    <select className="bg-slate-100 dark:bg-slate-800 border-none py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/50 text-sm font-medium cursor-pointer"
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(Number(e.target.value))}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{m}月份</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all">
                  <Download className="w-4 h-4" />匯出報表
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "總預算金額", value: `$${totalBudget.toLocaleString()}`, sub: "收支合計預算", icon: <Wallet className="w-8 h-8 text-blue-600 bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-lg" />, color: "text-blue-600" },
                { label: "實際總金額", value: `$${totalActual.toLocaleString()}`, sub: "收支合計實際", icon: <Banknote className="w-8 h-8 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 p-1.5 rounded-lg" />, color: "text-emerald-600" },
                { label: "收支淨差異", value: `$${Math.abs(totalIncomeBudget - totalExpenseBudget).toLocaleString()}`, sub: "收入-支出預算", icon: <TrendingDown className="w-8 h-8 text-orange-600 bg-orange-50 dark:bg-orange-900/30 p-1.5 rounded-lg" />, color: "text-orange-600" },
                { label: "整體達成率", value: `${achievement}%`, sub: "", icon: <PieChart className="w-8 h-8 text-purple-600 bg-purple-50 dark:bg-purple-900/30 p-1.5 rounded-lg" />, color: "text-purple-600", isProgress: true, pct: achievement },
              ].map(k => (
                <div key={k.label} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm font-medium">{k.label}</span>
                    {k.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{k.value}</h3>
                    {k.sub && <p className="text-xs text-slate-500 mt-1">{k.sub}</p>}
                    {k.isProgress && (
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-3">
                        <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min(k.pct ?? 0, 100)}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Budget Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50">
                <h3 className="font-bold text-lg">會計科目明細</h3>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"><Search className="w-4 h-4" />搜尋</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 font-semibold text-xs">
                      <th className="px-6 py-4 w-1/3">會計科目</th>
                      <th className="px-6 py-4 text-right">預算金額</th>
                      <th className="px-6 py-4 text-right">實際金額</th>
                      <th className="px-6 py-4 text-right">差異</th>
                      <th className="px-6 py-4 text-center w-36">達成率</th>
                      <th className="px-6 py-4 text-center w-28">狀態</th>
                      <th className="px-6 py-4 text-right w-24">操作</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                      <tr><td colSpan={7} className="py-16 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />載入中...</td></tr>
                    ) : accounts.length === 0 ? (
                      <tr><td colSpan={7} className="py-16 text-center text-slate-400">
                        查無預算資料，點擊「新增科目」開始建立。
                      </td></tr>
                    ) : (
                      <>
                        {/* Income rows */}
                        {incomes.length > 0 && (
                          <>
                            <SectionHeader type="income" budgetTotal={totalIncomeBudget} actualTotal={totalIncomeActual} />
                            {incomes.map(a => {
                              const diff = a.actual_amount - a.budget_amount;
                              return (
                                <tr key={a.id} className={rowCls}>
                                  <td className="px-6 py-3 pl-12 flex items-center gap-2 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                    {a.account_name}
                                  </td>
                                  <td className="px-6 py-3 text-right font-mono text-slate-500">${a.budget_amount.toLocaleString()}</td>
                                  <td className="px-6 py-3 text-right font-mono font-medium">${a.actual_amount.toLocaleString()}</td>
                                  <td className={cn("px-6 py-3 text-right font-mono", diff >= 0 ? "text-green-600" : "text-red-500")}>
                                    {diff >= 0 ? "+" : ""}${diff.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-3"><BarCell actual={a.actual_amount} budget={a.budget_amount} type="income" /></td>
                                  <td className="px-6 py-3 text-center"><StatusCell actual={a.actual_amount} budget={a.budget_amount} type="income" /></td>
                                  <td className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => setDeleteTarget(a)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        )}

                        {/* Expense rows */}
                        {expenses.length > 0 && (
                          <>
                            <SectionHeader type="expense" budgetTotal={totalExpenseBudget} actualTotal={totalExpenseActual} />
                            {expenses.map(a => {
                              const diff = a.budget_amount - a.actual_amount;
                              const over = a.actual_amount > a.budget_amount;
                              return (
                                <tr key={a.id} className={cn(rowCls, over && "bg-red-50/50 dark:bg-red-900/10")}>
                                  <td className="px-6 py-3 pl-12 flex items-center gap-2 font-medium">
                                    <span className={cn("w-1.5 h-1.5 rounded-full", over ? "bg-red-400" : "bg-slate-300 dark:bg-slate-600")} />
                                    {a.account_name}
                                  </td>
                                  <td className="px-6 py-3 text-right font-mono text-slate-500">${a.budget_amount.toLocaleString()}</td>
                                  <td className={cn("px-6 py-3 text-right font-mono", over ? "font-bold text-red-600 dark:text-red-400" : "font-medium")}>
                                    ${a.actual_amount.toLocaleString()}
                                  </td>
                                  <td className={cn("px-6 py-3 text-right font-mono", diff >= 0 ? "text-green-600" : "text-red-600 font-bold")}>
                                    {diff >= 0 ? "+" : ""}${diff.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-3"><BarCell actual={a.actual_amount} budget={a.budget_amount} type="expense" /></td>
                                  <td className="px-6 py-3 text-center"><StatusCell actual={a.actual_amount} budget={a.budget_amount} type="expense" /></td>
                                  <td className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => setDeleteTarget(a)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/30">
                <span className="text-xs text-slate-500">共 {accounts.length} 筆科目</span>
                <p className="text-[10px] text-slate-400">最後更新：{new Date().toLocaleString("zh-TW")} • 核准單位：財務委員會</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Add/Edit Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editTarget ? "編輯預算科目" : "新增預算科目"}
        subtitle={`${viewMode === "monthly" ? `${selectedYear}年${selectedMonth}月` : `${selectedYear}年度`} 科目`}
        width="max-w-md"
      >
        <div className="flex flex-col gap-4">
          {/* Type and planning mode toggle */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="科目類型" required>
              <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setForm(f => ({ ...f, account_type: "income" }))}
                  className={cn("flex-1 py-2 text-xs font-bold transition-colors",
                    form.account_type === "income" ? "bg-emerald-500 text-white" : "bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900"
                  )}
                >收入</button>
                <button
                  onClick={() => setForm(f => ({ ...f, account_type: "expense" }))}
                  className={cn("flex-1 py-2 text-xs font-bold transition-colors",
                    form.account_type === "expense" ? "bg-red-600 text-white" : "bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900"
                  )}
                >支出</button>
              </div>
            </Field>

            <Field label="規劃週期" required>
              <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setForm(f => ({ ...f, planning_type: "yearly" }))}
                  className={cn("flex-1 py-2 text-xs font-bold transition-colors",
                    form.planning_type === "yearly" ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900"
                  )}
                >年度</button>
                <button
                  onClick={() => setForm(f => ({ ...f, planning_type: "monthly" }))}
                  className={cn("flex-1 py-2 text-xs font-bold transition-colors",
                    form.planning_type === "monthly" ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900"
                  )}
                >每月</button>
              </div>
            </Field>
          </div>

          {/* Year/Month selection */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="預算年度" required>
              <select className={inputCls} value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}>
                {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <option key={y} value={y}>{y}年度</option>
                ))}
              </select>
            </Field>
            {form.planning_type === "monthly" && (
              <Field label="預算月份" required>
                <select className={inputCls} value={form.month} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{m}月份</option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <Field label={`科目名稱 (${form.year}年${form.planning_type === "monthly" ? `${form.month}月` : "度"})`} required>
            <input className={inputCls} placeholder="例：一般捐款 / 寺廟修繕" value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))} />
          </Field>

          <div className="grid grid-cols-1 gap-4">
            <Field label="預算金額（元）" required>
              <input type="number" min="0" className={inputCls} placeholder="500000" value={form.budget_amount} onChange={e => setForm(f => ({ ...f, budget_amount: e.target.value }))} />
            </Field>
          </div>

          {formError && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{formError}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">取消</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm rounded-lg transition-colors">
              {saving ? "儲存中..." : editTarget ? "儲存變更" : "新增科目"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="確認刪除科目" width="max-w-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <Trash2 className="w-5 h-5 text-red-600 flex-none mt-0.5" />
            <p className="text-sm text-slate-700 dark:text-slate-300">
              確定要刪除科目 <strong>「{deleteTarget?.account_name}」</strong> 嗎？此動作無法復原。
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
