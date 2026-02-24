import { Link, useLocation } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { cn } from "@/utils/cn";

export function Topbar() {
  const location = useLocation();

  const navItems = [
    { name: "總覽儀表板", path: "/" },
    { name: "捐款管理", path: "/receipts" },
    { name: "支出管理", path: "#" },
    { name: "財務報表", path: "/budget" },
    { name: "設定", path: "#" },
  ];

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-10 py-3 shadow-sm">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4 text-blue-600 dark:text-blue-400">
          <div className="w-8 h-8 flex items-center justify-center bg-blue-600/10 rounded-lg text-blue-600">
            <div
              className="bg-center bg-no-repeat bg-cover rounded-full h-8 w-8 flex-shrink-0"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDFGoZpDVBrsmVRnbm4HasWiiRRHsYRuomaQhfkTYCit1BqOK-YbtbBUQG2BQH8rzUMoB-qbje34Rt5McN8w3wjL6CPHsFL4duZxulxSRUbUnzRdLWgYXfqag0p1N75AuCkj4GlM7MjDcdqeGjyEoBEKhcn1qxMJAAKHy5snzjvlvL71gjUgsqB-DU3s2_aijBSsOrDmbK22Km0MRYn2U1SwwhrwZLNViitKyqYKfBbKCD0ts6KyjDeS-vNG-U5CeODP_vsNIpdoGk")',
              }}
            />
          </div>
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
            開山寺財務系統
          </h2>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "text-sm transition-colors leading-normal",
                  isActive
                    ? "text-blue-600 font-bold border-b-2 border-blue-600 pb-0.5"
                    : "text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 font-medium"
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex flex-1 justify-end gap-6 items-center">
        <div className="relative hidden sm:block w-full max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            className="w-full rounded-lg bg-slate-100 dark:bg-slate-800 border-none py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-600"
            placeholder="搜尋科目..."
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>
          <div
            className="bg-center bg-no-repeat bg-cover rounded-full w-10 h-10 border-2 border-white dark:border-slate-900 shadow-sm cursor-pointer"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAhJnhiAACSe7FO_XV32K56N81JRMyqTtGAYcDn5BLZksfvt-GxgzLASp3Gq9fnXPoQwbVlUDxqnt8rXDtk6N954hnfvBTUNSZo9tnXUhPLnARF41evZZGTEVukDWu_AOyIlkR36tLVmx2ZvNzuDNZ0YUKAbQOp0RpJpyIgHzn7MqmPM_fWSooN1IIHf-svY4NPicRO_CJ15UNfAgfAZ8ZtyR-Phs4GKbL5bX5DGGcHeJS5n8iE0cdsKMnEKyrjrkT352dLWJkjJM4")',
            }}
          />
        </div>
      </div>
    </header>
  );
}
