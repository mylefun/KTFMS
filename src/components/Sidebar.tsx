import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ReceiptText,
  CreditCard,
  PiggyBank,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/utils/cn";

export function Sidebar() {
  const location = useLocation();

  const navItems = [
    { name: "儀表板", path: "/", icon: LayoutDashboard },
    { name: "一般捐款", path: "/receipts", icon: ReceiptText },
    { name: "支出管理", path: "/expenses", icon: CreditCard },
    { name: "預算與決算", path: "/budget", icon: PiggyBank },
    { name: "報表中心", path: "/reports", icon: BarChart3 },
    { name: "系統設定", path: "#", icon: Settings },
  ];

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full flex-shrink-0 z-20">
      <div className="flex h-full flex-col justify-between p-4">
        <div className="flex flex-col gap-6">
          <div className="flex gap-3 items-center px-2">
            <div
              className="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 flex-shrink-0 shadow-sm border border-slate-100 dark:border-slate-700"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDFGoZpDVBrsmVRnbm4HasWiiRRHsYRuomaQhfkTYCit1BqOK-YbtbBUQG2BQH8rzUMoB-qbje34Rt5McN8w3wjL6CPHsFL4duZxulxSRUbUnzRdLWgYXfqag0p1N75AuCkj4GlM7MjDcdqeGjyEoBEKhcn1qxMJAAKHy5snzjvlvL71gjUgsqB-DU3s2_aijBSsOrDmbK22Km0MRYn2U1SwwhrwZLNViitKyqYKfBbKCD0ts6KyjDeS-vNG-U5CeODP_vsNIpdoGk")',
              }}
            />
            <div className="flex flex-col overflow-hidden">
              <h1 className="text-slate-900 dark:text-white text-base font-bold leading-tight truncate">
                開山寺
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium truncate">
                財務管理系統
              </p>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
                    isActive
                      ? "bg-red-700/10 text-red-700 dark:text-red-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 transition-transform group-hover:scale-105",
                      isActive ? "text-red-700 dark:text-red-400" : ""
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm",
                      isActive ? "font-bold" : "font-medium"
                    )}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center justify-between px-3 py-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
              管
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                管理員
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                查看個人資料
              </p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
