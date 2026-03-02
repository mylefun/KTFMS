import { Sidebar } from "@/components/Sidebar";
import { Download, Loader2, ArrowUpRight, ArrowDownRight, Activity, FileText, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/utils/cn";
import { supabase } from "@/lib/supabase";
import type { Receipt, Transaction, BudgetAccount } from "@/types/database";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";

// ─── Colors for Categories ────────────────────────────────────
const PIE_COLORS: Record<string, string> = {
    "光明燈": "#a855f7", // purple-500
    "平安燈": "#3b82f6", // blue-500
    "其他收入": "#f97316", // orange-500
    "法會收入": "#22c55e", // green-500
    "水電瓦斯": "#3b82f6", // blue-500
    "辦公雜支": "#f97316", // orange-500
    "法會支出": "#a855f7", // purple-500
    "修繕工程": "#6366f1", // indigo-500
    "其他": "#94a3b8", // slate-400
};
const DEFAULT_COLOR = "#94a3b8";

// ─── Formatter ───────────────────────────────────────────────
const formatCurrency = (val: number) => `$${val.toLocaleString()}`;

// ─── Main Component ──────────────────────────────────────────
export default function Reports() {
    const [loading, setLoading] = useState(true);
    const [dataYear, setDataYear] = useState<number>(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<'overview' | 'structure'>('overview');

    // RAW Data
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [expenses, setExpenses] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<BudgetAccount[]>([]);

    const fetchReportData = useCallback(async () => {
        setLoading(true);

        // Fetch receipts for the current year, normal status only
        const startOfYear = `${dataYear}-01-01`;
        const endOfYear = `${dataYear}-12-31`;

        const { data: recData } = await supabase
            .from("receipts")
            .select("*")
            .eq("status", "normal")
            .gte("date", startOfYear)
            .lte("date", endOfYear);

        const { data: expData } = await supabase
            .from("transactions")
            .select("*")
            .lt("amount", 0) // Only expenses
            .gte("date", startOfYear)
            .lte("date", endOfYear);

        const { data: budData } = await supabase
            .from("budget_accounts")
            .select("*")
            .eq("year", dataYear)
            .is("month", null); // Fetch yearly budgets only for this view

        setReceipts(recData ?? []);
        setExpenses(expData ?? []);
        setBudgets(budData ?? []);
        setLoading(false);
    }, [dataYear]);

    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);

    // ── Aggregations ─────────────────────────────────────────
    const totalIncome = receipts.reduce((sum, r) => sum + r.amount, 0);
    const totalExpense = expenses.reduce((sum, r) => sum + Math.abs(r.amount), 0);
    const netBalance = totalIncome - totalExpense;

    // 1. Monthly Bar Chart Data
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        name: `${i + 1}月`,
        收入: 0,
        支出: 0,
    }));

    receipts.forEach(r => {
        const month = new Date(r.date).getMonth();
        monthlyData[month].收入 += r.amount;
    });

    expenses.forEach(e => {
        const month = new Date(e.date).getMonth();
        monthlyData[month].支出 += Math.abs(e.amount);
    });

    // 2. Income Category Data (Actual + Budget)
    const incCats: Record<string, { actual: number; budget: number }> = {};
    receipts.forEach(r => {
        if (!incCats[r.category]) incCats[r.category] = { actual: 0, budget: 0 };
        incCats[r.category].actual += r.amount;
    });
    budgets.filter(b => b.account_type === 'income').forEach(b => {
        if (!incCats[b.account_name]) incCats[b.account_name] = { actual: 0, budget: 0 };
        incCats[b.account_name].budget += b.budget_amount;
    });
    const incomePieData = Object.entries(incCats).map(([name, val]) => ({
        name,
        value: val.actual,
        budget: val.budget,
        pct: val.budget > 0 ? Math.round((val.actual / val.budget) * 100) : 0
    }));

    // 3. Expense Category Data (Actual + Budget)
    const expCats: Record<string, { actual: number; budget: number }> = {};
    expenses.forEach(e => {
        if (!expCats[e.category]) expCats[e.category] = { actual: 0, budget: 0 };
        expCats[e.category].actual += Math.abs(e.amount);
    });
    budgets.filter(b => b.account_type === 'expense').forEach(b => {
        if (!expCats[b.account_name]) expCats[b.account_name] = { actual: 0, budget: 0 };
        expCats[b.account_name].budget += b.budget_amount;
    });
    const expensePieData = Object.entries(expCats).map(([name, val]) => ({
        name,
        value: val.actual,
        budget: val.budget,
        pct: val.budget > 0 ? Math.round((val.actual / val.budget) * 100) : 0
    }));


    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* ── Header ── */}
                <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-5 flex items-center justify-between z-20 print:hidden">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">報表中心</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">財務分析圖表與綜合報表。</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <select
                            value={dataYear}
                            onChange={(e) => setDataYear(Number(e.target.value))}
                            className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium outline-none"
                        >
                            {[0, 1, 2, 3, 4].map(offset => {
                                const y = new Date().getFullYear() - offset;
                                return <option key={y} value={y}>{y}年度</option>
                            })}
                        </select>
                        {activeTab === 'structure' ? (
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-sm shadow-sm transition-colors"
                            >
                                <FileText className="w-5 h-5" />匯出 PDF
                            </button>
                        ) : (
                            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors">
                                <Download className="w-5 h-5" />匯出報表
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-8">
                    {/* ── Tabs ── */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit mb-8 print:hidden">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={cn(
                                "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                                activeTab === 'overview'
                                    ? "bg-white dark:bg-slate-700 text-red-700 dark:text-red-400 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            )}
                        >
                            收支總覽
                        </button>
                        <button
                            onClick={() => setActiveTab('structure')}
                            className={cn(
                                "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                                activeTab === 'structure'
                                    ? "bg-white dark:bg-slate-700 text-red-700 dark:text-red-400 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            )}
                        >
                            結構分析
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-3" />
                            <p>載入報表中...</p>
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto">
                            {activeTab === 'overview' ? (
                                <>
                                    {/* ── KPI ── */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-slate-500 text-sm font-bold tracking-wide uppercase">年度總結餘</p>
                                                <div className={cn("p-2 rounded-full", netBalance >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                                                    <Activity className="w-5 h-5" />
                                                </div>
                                            </div>
                                            <h3 className={cn("text-3xl font-black mt-2", netBalance >= 0 ? "text-green-600" : "text-red-600")}>
                                                {formatCurrency(netBalance)}
                                            </h3>
                                        </div>

                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-slate-500 text-sm font-bold tracking-wide uppercase">年度總收入</p>
                                                <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                                                    <ArrowUpRight className="w-5 h-5" />
                                                </div>
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                                                {formatCurrency(totalIncome)}
                                            </h3>
                                        </div>

                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-slate-500 text-sm font-bold tracking-wide uppercase">年度總支出</p>
                                                <div className="p-2 rounded-full bg-orange-100 text-orange-600">
                                                    <ArrowDownRight className="w-5 h-5" />
                                                </div>
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                                                {formatCurrency(totalExpense)}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Monthly Bar Chart */}
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">每月收支比較</h3>
                                        <div className="h-96">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                                                    <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                                    <RechartsTooltip
                                                        formatter={(value: number) => [formatCurrency(value), ""]}
                                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                                    <Bar dataKey="收入" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                                    <Bar dataKey="支出" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block print:space-y-8">
                                    <style dangerouslySetInnerHTML={{
                                        __html: `
                                        @media print {
                                            @page { size: A4; margin: 1cm; }
                                            body { background: white !important; }
                                            .print\\:hidden { display: none !important; }
                                            .print\\:block { display: block !important; }
                                            .shadow-sm { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
                                            main { padding: 0 !important; overflow: visible !important; height: auto !important; }
                                            .flex-1 { overflow: visible !important; }
                                            aside { display: none !important; }
                                            .max-w-7xl { max-width: none !important; }
                                        }
                                    `}} />

                                    {/* Income Analysis */}
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col break-inside-avoid">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">收入結構分析 ({dataYear}年度)</h3>
                                        {incomePieData.length > 0 ? (
                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 overflow-hidden flex-1">
                                                <div className="flex justify-between items-center mb-5 pb-2 border-b border-slate-200 dark:border-slate-700">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">收入組成明細</h4>
                                                    <div className="flex gap-10 text-[10px] uppercase font-bold text-slate-400">
                                                        <span className="w-16 text-right">預算</span>
                                                        <span className="w-16 text-right">實際</span>
                                                        <span className="w-12 text-right">達成率</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    {incomePieData.sort((a, b) => b.value - a.value).map(item => (
                                                        <div key={item.name} className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[item.name] || DEFAULT_COLOR }} />
                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <span className="text-xs text-slate-500 w-16 text-right tabular-nums">{formatCurrency(item.budget)}</span>
                                                                <span className="text-sm font-bold w-16 text-right tabular-nums">{formatCurrency(item.value)}</span>
                                                                <span className={cn("text-sm font-black w-12 text-right", item.pct >= 100 ? "text-green-600" : item.pct >= 70 ? "text-amber-600" : "text-red-500")}>
                                                                    {item.pct}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl">目前尚無資料</div>
                                        )}
                                    </div>

                                    {/* Expense Analysis */}
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col break-inside-avoid">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">支出結構分析 ({dataYear}年度)</h3>
                                        {expensePieData.length > 0 ? (
                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 overflow-hidden flex-1">
                                                <div className="flex justify-between items-center mb-5 pb-2 border-b border-slate-200 dark:border-slate-700">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">支出組成明細</h4>
                                                    <div className="flex gap-10 text-[10px] uppercase font-bold text-slate-400">
                                                        <span className="w-16 text-right">預算</span>
                                                        <span className="w-16 text-right">實際</span>
                                                        <span className="w-12 text-right">達成率</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    {expensePieData.sort((a, b) => b.value - a.value).map(item => (
                                                        <div key={item.name} className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[item.name] || DEFAULT_COLOR }} />
                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <span className="text-xs text-slate-500 w-16 text-right tabular-nums">{formatCurrency(item.budget)}</span>
                                                                <span className="text-sm font-bold w-16 text-right tabular-nums">{formatCurrency(item.value)}</span>
                                                                <span className={cn("text-sm font-black w-12 text-right", item.pct > 100 ? "text-red-600" : "text-green-600")}>
                                                                    {item.pct}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl">目前尚無資料</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
