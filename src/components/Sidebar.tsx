import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  ReceiptText,
  CreditCard,
  PiggyBank,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Users,
  UserCircle,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "motion/react";

export function Sidebar() {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { name: "儀表板", path: "/", icon: LayoutDashboard },
    { name: "收入管理", path: "/receipts", icon: ReceiptText },
    { name: "支出管理", path: "/expenses", icon: CreditCard },
    { name: "預算與決算", path: "/budget", icon: PiggyBank },
    { name: "報表中心", path: "/reports", icon: BarChart3 },
    { name: "往來對象管理", path: "/donors", icon: UserCircle },
    ...(profile?.role === "admin"
      ? [
        { name: "使用者管理", path: "/users", icon: Users },
        { name: "系統設定", path: "/settings", icon: Settings },
      ]
      : []),
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full flex-shrink-0 z-20 relative transition-colors duration-300"
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 shadow-md z-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group"
      >
        <ChevronLeft
          className={cn(
            "w-4 h-4 text-slate-500 transition-transform duration-300 group-hover:text-red-700",
            isCollapsed && "rotate-180"
          )}
        />
      </button>

      <div className="flex h-full flex-col justify-between p-4 overflow-hidden">
        <div className="flex flex-col gap-6">
          <div className={cn("flex gap-3 items-center px-2", isCollapsed && "justify-center")}>
            <div
              className="bg-center bg-no-repeat bg-cover rounded-xl h-10 w-10 flex-shrink-0 shadow-sm border border-slate-100 dark:border-slate-700 transition-all duration-300"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDFGoZpDVBrsmVRnbm4HasWiiRRHsYRuomaQhfkTYCit1BqOK-YbtbBUQG2BQH8rzUMoB-qbje34Rt5McN8w3wjL6CPHsFL4duZxulxSRUbUnzRdLWgYXfqag0p1N75AuCkj4GlM7MjDcdqeGjyEoBEKhcn1qxMJAAKHy5snzjvlvL71gjUgsqB-DU3s2_aijBSsOrDmbK22Km0MRYn2U1SwwhrwZLNViitKyqYKfBbKCD0ts6KyjDeS-vNG-U5CeODP_vsNIpdoGk")',
              }}
            />
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col overflow-hidden"
              >
                <h1 className="text-slate-900 dark:text-white text-base font-bold leading-tight truncate">
                  開山廟
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium truncate">
                  財務管理系統
                </p>
              </motion.div>
            )}
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  title={isCollapsed ? item.name : ""}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative overflow-hidden",
                    isActive
                      ? "bg-red-700/10 text-red-700 dark:text-red-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
                      isActive ? "text-red-700 dark:text-red-400" : ""
                    )}
                  />
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "text-sm whitespace-nowrap",
                        isActive ? "font-bold" : "font-medium"
                      )}
                    >
                      {item.name}
                    </motion.span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-red-700 rounded-r-full"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className={cn(
          "flex items-center border-t border-slate-100 dark:border-slate-800 mt-auto pt-4 transition-all duration-300",
          isCollapsed ? "justify-center" : "justify-between px-3"
        )}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs flex-shrink-0 shadow-inner">
              {profile?.role === "admin" ? "管" : "用"}
            </div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col min-w-0"
              >
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {profile?.role === "admin" ? "管理員" : "一般使用者"}
                </p>
                <p
                  className="text-[10px] text-slate-400 dark:text-slate-500 truncate"
                  title={user?.email || ""}
                >
                  {user?.email || "未登入"}
                </p>
              </motion.div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={signOut}
              className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg group"
              title="登出"
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
