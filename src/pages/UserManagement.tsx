import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Modal } from "@/components/Modal";
import {
    Plus, Search, MoreVertical, X, CheckCircle2,
    Loader2, User as UserIcon, Shield, Mail, Calendar,
    UserMinus, UserPlus, AlertCircle
} from "lucide-react";
import { cn } from "@/utils/cn";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";

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
export default function UserManagement() {
    const { profile: currentProfile } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // create user modal
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ email: "", password: "", role: "user" as "admin" | "user" });
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // toggle loading
    const [toggleLoading, setToggleLoading] = useState<string | null>(null);

    // ── fetch ──────────────────────────────────────────────────
    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        let q = supabase.from("profiles").select("*").order("created_at", { ascending: false });

        if (search.trim()) {
            q = q.ilike("email", `%${search}%`);
        }

        const { data, error } = await q;
        if (!error) {
            setProfiles(data || []);
        }
        setLoading(false);
    }, [search]);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    // ── handlers ────────────────────────────────────────────────
    const handleToggleStatus = async (targetProfile: Profile) => {
        // Prevent disabling yourself if you are an admin
        if (targetProfile.id === currentProfile?.id) {
            alert("您不能停用自己的帳號");
            return;
        }

        setToggleLoading(targetProfile.id);
        const { error } = await (supabase
            .from("profiles") as any)
            .update({ is_disabled: !targetProfile.is_disabled, updated_at: new Date().toISOString() })
            .eq("id", targetProfile.id);

        if (!error) {
            fetchProfiles();
        } else {
            alert("更新失敗：" + error.message);
        }
        setToggleLoading(null);
    };

    const handleCreateUser = async () => {
        if (!form.email.trim() || !form.password.trim()) {
            setFormError("請填寫 Email 與密碼");
            return;
        }

        setSaving(true);
        setFormError("");
        setSuccessMsg("");

        // Note: This uses standard signUp. 
        // In a production app, an Admin Auth API or Edge Function would be better.
        const { data, error } = await supabase.auth.signUp({
            email: form.email.trim(),
            password: form.password.trim(),
            options: {
                data: {
                    role: form.role,
                }
            }
        });

        if (error) {
            setFormError(error.message);
        } else {
            setSuccessMsg("使用者已建立。若啟用了郵件驗證，請通知使用者查收。");
            // Wait a moment and refresh
            setTimeout(() => {
                setModalOpen(false);
                setForm({ email: "", password: "", role: "user" });
                setSuccessMsg("");
                fetchProfiles();
            }, 2000);
        }
        setSaving(false);
    };

    return (
        <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Header */}
                <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-5 flex items-center justify-between z-20">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">使用者管理</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">管理系統存取權限，建立新帳號或停用離職人員。</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { setFormError(""); setModalOpen(true); }}
                            className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-lg transition-all shadow-sm flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            新增帳號
                        </button>
                    </div>
                </header>

                {/* Filters/Search */}
                <div className="flex-none px-8 py-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 z-10">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="搜尋 Email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-red-700/20 focus:border-red-700 outline-none transition-all placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto px-8 py-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-4">使用者 Email</th>
                                    <th className="px-6 py-4">角色權限</th>
                                    <th className="px-6 py-4">建立日期</th>
                                    <th className="px-6 py-4">狀態</th>
                                    <th className="px-6 py-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <Loader2 className="w-8 h-8 text-red-700 animate-spin mx-auto mb-3" />
                                            <p className="text-slate-400 text-sm">正在讀取使用者資料...</p>
                                        </td>
                                    </tr>
                                ) : profiles.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-medium">
                                            找不到相符的使用者
                                        </td>
                                    </tr>
                                ) : (
                                    profiles.map((p) => (
                                        <tr key={p.id} className={cn(
                                            "group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors",
                                            p.is_disabled && "opacity-60 bg-slate-50/30 dark:bg-slate-900/30"
                                        )}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-transparent group-hover:ring-slate-100 dark:group-hover:ring-slate-800 transition-all",
                                                        p.role === "admin" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                    )}>
                                                        {p.email?.charAt(0).toUpperCase() || "?"}
                                                    </div>
                                                    <span className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]" title={p.email || ""}>
                                                        {p.email}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit",
                                                    p.role === "admin"
                                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50"
                                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50"
                                                )}>
                                                    <Shield className="w-3 h-3" />
                                                    {p.role === "admin" ? "管理員" : "一般使用者"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-500 text-xs">
                                                    <Calendar className="w-3.5 h-3.5 opacity-50" />
                                                    {new Date(p.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={cn(
                                                    "flex items-center gap-1.5 text-xs font-bold",
                                                    p.is_disabled ? "text-amber-600" : "text-green-600"
                                                )}>
                                                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", p.is_disabled ? "bg-amber-500" : "bg-green-500")} />
                                                    {p.is_disabled ? "已停用" : "使用中"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleToggleStatus(p)}
                                                    disabled={toggleLoading === p.id}
                                                    className={cn(
                                                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                                        p.is_disabled
                                                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/10 dark:text-green-400 dark:border-green-800/50"
                                                            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/10 dark:text-amber-400 dark:border-amber-800/50"
                                                    )}
                                                >
                                                    {toggleLoading === p.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : p.is_disabled ? (
                                                        <>
                                                            <UserPlus className="w-3 h-3" /> 啟用帳號
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserMinus className="w-3 h-3" /> 停用帳號
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Create User Modal */}
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="新增使用者帳號"
                width="max-w-md"
            >
                <div className="flex flex-col gap-5 py-2">
                    {formError && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> {formError}
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-400 text-xs font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> {successMsg}
                        </div>
                    )}

                    <Field label="電子郵件 (Email)" required>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className={cn(inputCls, "pl-10")}
                                placeholder="user@example.com"
                                autoFocus
                            />
                        </div>
                    </Field>

                    <Field label="預設密碼" required>
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            className={inputCls}
                            placeholder="至少 6 位字元"
                        />
                    </Field>

                    <Field label="角色權限" required>
                        <select
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "user" })}
                            className={inputCls}
                        >
                            <option value="user">一般使用者 (User)</option>
                            <option value="admin">管理員 (Admin)</option>
                        </select>
                    </Field>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                        <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <p>建立後，系統會自動在資料庫中建立對應的個人資料 (Profile)。</p>
                        </div>
                        <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
                            <p className="text-amber-600 dark:text-amber-500 font-medium">注意：目前的 Auth 設定可能需要郵件驗證，新使用者需點擊信中連結方能登入。</p>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end mt-4">
                        <button
                            onClick={() => setModalOpen(false)}
                            className="px-5 py-2.5 font-bold text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleCreateUser}
                            disabled={saving}
                            className="px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-lg shadow-sm transition-all flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {saving ? "處理中..." : "建立帳號"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
