import { ArrowRightLeft, Database, FolderKanban, History, LogOut, Users } from "lucide-react";
import { cn } from "../lib/cn";
import type { AuthUser } from "../types";
import ThemeToggle from "./ui/ThemeToggle";

export type View = "wizard" | "projects" | "history" | "admin";

interface Props {
    user: AuthUser;
    view: View;
    onNavigate: (view: View) => void;
    onLogout: () => void;
}

const initials = (name: string) =>
    name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

export default function Sidebar({ user, view, onNavigate, onLogout }: Props) {
    const navItems: { key: View; label: string; icon: typeof ArrowRightLeft; adminOnly?: boolean }[] = [
        { key: "wizard", label: "Migration", icon: ArrowRightLeft },
        { key: "projects", label: "Projects", icon: FolderKanban },
        { key: "history", label: "History", icon: History },
        { key: "admin", label: "User Management", icon: Users, adminOnly: true }
    ];

    return (
        <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b0c11]">
            <div className="flex items-center gap-2.5 px-5 py-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 shadow-sm shadow-indigo-500/30">
                    <Database className="h-5 w-5 text-white" />
                </div>
                <div>
                    <p className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">DataBridge</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Migration Studio</p>
                </div>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-2">
                {navItems
                    .filter((item) => !item.adminOnly || user.role === "admin")
                    .map((item) => {
                        const active = view === item.key;
                        return (
                            <button
                                key={item.key}
                                onClick={() => onNavigate(item.key)}
                                className={cn(
                                    "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                    active
                                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200"
                                )}
                            >
                                {active && (
                                    <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-indigo-500 shadow-[0_0_8px] shadow-indigo-500/60" />
                                )}
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </button>
                        );
                    })}
            </nav>

            <div className="border-t border-slate-200 p-3 dark:border-white/10">
                <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                        {initials(user.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                        <p className="truncate text-xs capitalize text-slate-500 dark:text-slate-400">{user.role}</p>
                    </div>
                    <ThemeToggle />
                    <button
                        onClick={onLogout}
                        title="Log out"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
