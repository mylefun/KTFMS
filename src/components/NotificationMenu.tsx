import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { cn } from '@/utils/cn';

// Simulate some initial notifications
const initialNotifications = [
    {
        id: '1',
        title: '有一筆新捐款待確認',
        message: '王大明捐款了 $5,000 元，請至捐款管理確認。',
        time: '5 分鐘前',
        read: false,
        type: 'receipt', // could be receipt, expense, system
    },
    {
        id: '2',
        title: '月度財務報表已產出',
        message: '本月的財務收支報表已自動產生，點擊查看詳細資訊。',
        time: '2 小時前',
        read: false,
        type: 'system',
    },
    {
        id: '3',
        title: '修繕基金進度更新',
        message: '「修繕基金」專案目前達成率已達 15%，距離目標還差 $170,000。',
        time: '1 天前',
        read: true,
        type: 'project',
    }
];

export function NotificationMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState(initialNotifications);
    const menuRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Handle click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const removeNotification = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // prevent triggering markAsRead
        setNotifications(prev => prev.filter(n => n.id !== id));
    };


    return (
        <div className="relative" ref={menuRef}>
            {/* Bell Button */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen((prev) => !prev);
                }}
                className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full transition-colors relative",
                    isOpen
                        ? "bg-slate-100 dark:bg-slate-800 text-blue-600"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                )}
            >
                <Bell className="w-5 h-5 pointer-events-none" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 pointer-events-none"></span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden z-50 origin-top-right transition-all"
                    onClick={(e) => e.stopPropagation()}
                >

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            通知訊息
                            {unreadCount > 0 && (
                                <span className="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full font-medium">
                                    {unreadCount} 未讀
                                </span>
                            )}
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                            >
                                <Check className="w-3.5 h-3.5" />
                                全部標示為已讀
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[70vh] overflow-y-auto overscroll-contain">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                                <Bell className="w-10 h-10 mb-2 opacity-20" />
                                <p className="text-sm">目前沒有任何通知</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {notifications.map((notification) => (
                                    <li
                                        key={notification.id}
                                        onClick={() => markAsRead(notification.id)}
                                        className={cn(
                                            "group px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative",
                                            !notification.read ? "bg-blue-50/50 dark:bg-blue-900/10" : "opacity-75 hover:opacity-100"
                                        )}
                                    >
                                        {!notification.read && (
                                            <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-600 dark:bg-blue-500"></span>
                                        )}
                                        <div className="flex gap-3">
                                            <div className="flex-1 min-w-0 pr-6">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className={cn(
                                                        "text-sm font-medium truncate",
                                                        !notification.read ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
                                                    )}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap ml-2">
                                                        {notification.time}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                                                    {notification.message}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Delete button (shows on hover) */}
                                        <button
                                            onClick={(e) => removeNotification(notification.id, e)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                                            title="刪除通知"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Footer (Optional) */}
                    {notifications.length > 0 && (
                        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                            <button
                                onClick={() => setNotifications([])}
                                className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800"
                            >
                                <Trash2 className="w-4 h-4" />
                                清空所有紀錄
                            </button>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}
