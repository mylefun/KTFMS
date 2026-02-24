import { Sidebar } from "@/components/Sidebar";
import { Download, Loader2, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/utils/cn";
import { supabase } from "@/lib/supabase";
import type { Receipt, Transaction } from "@/types/database";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";

// ─── Colors for Categories ────────────────────────────────────
const PIE_COLORS: Record<string, string> = {
    "光明燈": "#a855f7", // purple-500
    "平安燈": "#3b82f6", // blue-500
    "一般捐款": "#f97316", // orange-500
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

    // RAW Data
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [expenses, setExpenses] = useState<Transaction[]>([]);

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

        setReceipts(recData ?? []);
        setExpenses(expData ?? []);
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

    // 2. Income Category Pie Data
    const incCats: Record<string, number> = {};
    receipts.forEach(r => { incCats[r.category] = (incCats[r.category] || 0) + r.amount; });
    const incomePieData = Object.entries(incCats).map(([name, value]) => ({ name, value }));

    // 3. Expense Category Pie Data
    const expCats: Record<string, number> = {};
    expenses.forEach(e => { expCats[e.category] = (expCats[e.category] || 0) + Math.abs(e.amount); });
    const expensePieData = Object.entries(expCats).map(([name, value]) => ({ name, value }));


    return (
        <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* ── Header ── */}
                <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-5 flex items-center justify-between z-20">
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
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors">
                            <Download className="w-5 h-5" />匯出報表
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-3" />
                            <p>載入報表中...</p>
                        </div>
                    ) : (
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

                            {/* ── Charts ── */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                {/* Monthly Bar Chart (Span 2 columns on lg screens ideally, but let's do layout carefully) */}
                                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">每月收支比較</h3>
                                    <div className="h-80">
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

                                {/* Income Pie Chart */}
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">收入結構分析</h3>
                                    <div className="flex-1 h-64">
                                        {incomePieData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={incomePieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={90}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                    >
                                                        {incomePieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name] || DEFAULT_COLOR} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-slate-400">目前尚無資料</div>
                                        )}
                                    </div>
                                </div>

                                {/* Expense Pie Chart */}
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">支出結構分析</h3>
                                    <div className="flex-1 h-64">
                                        {expensePieData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={expensePieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={90}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                    >
                                                        {expensePieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name] || DEFAULT_COLOR} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-slate-400">目前尚無資料</div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
