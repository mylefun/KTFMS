import React, { useState, useEffect } from "react";
import { Sidebar } from "../components/Sidebar";
import { useTheme } from "../contexts/ThemeContext";
import {
    Building2,
    Phone,
    MapPin,
    Mail,
    Save,
    Moon,
    Sun,
    Monitor
} from "lucide-react";

// 定義寺廟設定型別
type TempleSettings = {
    name: string;
    phone: string;
    address: string;
    email: string;
};

export default function Settings() {
    const [templeSettings, setTempleSettings] = useState<TempleSettings>({
        name: "開山廟",
        phone: "",
        address: "",
        email: "",
    });

    const { theme, setTheme } = useTheme();
    const [isSaved, setIsSaved] = useState(false);

    // 載入設定
    useEffect(() => {
        const savedTemple = localStorage.getItem("templeSettings");
        if (savedTemple) {
            try {
                setTempleSettings(JSON.parse(savedTemple));
            } catch (e) {
                console.error("Failed to parse temple settings", e);
            }
        }
    }, []);

    // 處理輸入變更
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTempleSettings((prev) => ({
            ...prev,
            [name]: value,
        }));
        setIsSaved(false);
    };

    // 處理主題切換 (已遷回 Context)
    const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
        setTheme(newTheme);
    };

    // 儲存設定
    const handleSave = () => {
        localStorage.setItem("templeSettings", JSON.stringify(templeSettings));
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200 text-slate-900 dark:text-slate-100">
            <Sidebar />
            <div className="flex-1 flex flex-col relative overflow-hidden">
                <main className="flex-1 overflow-y-auto w-full">
                    {/* 頁面標題區塊 */}
                    <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">系統設定</h1>
                        </div>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
                        >
                            <Save size={16} />
                            儲存變更
                        </button>
                    </div>

                    <div className="p-8 max-w-4xl mx-auto space-y-8">

                        {/* 儲存成功提示 */}
                        {isSaved && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-lg flex items-center justify-between border border-emerald-200 dark:border-emerald-800/50">
                                <span className="text-sm font-medium">設定已成功儲存！</span>
                                <button onClick={() => setIsSaved(false)} className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* 基本資料設定 */}
                        <section className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">基本資料</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    設定寺廟的聯絡資訊，這些資訊將顯示在系統及收據上。
                                </p>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* 寺廟名稱 */}
                                <div className="space-y-2">
                                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        寺廟名稱
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Building2 className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={templeSettings.name}
                                            onChange={handleInputChange}
                                            className="block w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                            placeholder="例：開山廟"
                                        />
                                    </div>
                                </div>

                                {/* 聯絡電話 */}
                                <div className="space-y-2">
                                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        聯絡電話
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            id="phone"
                                            name="phone"
                                            value={templeSettings.phone}
                                            onChange={handleInputChange}
                                            className="block w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                            placeholder="例：02-12345678"
                                        />
                                    </div>
                                </div>

                                {/* 地址 */}
                                <div className="space-y-2 md:col-span-2">
                                    <label htmlFor="address" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        地址
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <MapPin className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            id="address"
                                            name="address"
                                            value={templeSettings.address}
                                            onChange={handleInputChange}
                                            className="block w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                            placeholder="詳細地址"
                                        />
                                    </div>
                                </div>

                                {/* 電子郵件 */}
                                <div className="space-y-2 md:col-span-2">
                                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        電子郵件
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={templeSettings.email}
                                            onChange={handleInputChange}
                                            className="block w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                            placeholder="contact@example.com"
                                        />
                                    </div>
                                </div>

                            </div>
                        </section>

                        {/* 系統外觀設定 */}
                        <section className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">系統外觀</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    自訂您偏好的系統顯示主題。
                                </p>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* 淺色模式 */}
                                    <button
                                        onClick={() => handleThemeChange("light")}
                                        className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all ${theme === "light"
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500 shadow-sm"
                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                            }`}
                                    >
                                        <Sun className="h-6 w-6 mb-2" />
                                        <span className="text-sm font-medium">淺色模式</span>
                                    </button>

                                    {/* 深色模式 */}
                                    <button
                                        onClick={() => handleThemeChange("dark")}
                                        className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all ${theme === "dark"
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500 shadow-sm"
                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                            }`}
                                    >
                                        <Moon className="h-6 w-6 mb-2" />
                                        <span className="text-sm font-medium">深色模式</span>
                                    </button>

                                    {/* 跟隨系統 */}
                                    <button
                                        onClick={() => handleThemeChange("system")}
                                        className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all ${theme === "system"
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500 shadow-sm"
                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                            }`}
                                    >
                                        <Monitor className="h-6 w-6 mb-2" />
                                        <span className="text-sm font-medium">跟隨系統</span>
                                    </button>
                                </div>
                            </div>
                        </section>

                    </div>
                </main>
            </div>
        </div>
    );
}
