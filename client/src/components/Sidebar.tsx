import { ArrowRightLeft, Database, LogOut, Users } from "lucide-react";
import { cn } from "../lib/cn";
import type { AuthUser } from "../types";

export type View = "wizard" | "admin";

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
    return (
        <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
            <div className="flex items-center gap-2 px-5 py-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
                    <Database className="h-5 w-5 text-white" />
                </div>
                <div>
                    <p className="text-sm font-semibold leading-tight text-slate-900">DataBridge</p>
                    <p className="text-xs text-slate-500">Migration Studio</p>
                </div>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-2">
                <button
                    onClick={() => onNavigate("wizard")}
                    className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        view === "wizard"
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                >
                    <ArrowRightLeft className="h-4 w-4" />
                    Migration
                </button>

                {user.role === "admin" && (
                    <button
                        onClick={() => onNavigate("admin")}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            view === "admin"
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-600 hover:bg-slate-100"
                        )}
                    >
                        <Users className="h-4 w-4" />
                        User Management
                    </button>
                )}
            </nav>

            <div className="border-t border-slate-200 p-3">
                <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                        {initials(user.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                        <p className="truncate text-xs capitalize text-slate-500">{user.role}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        title="Log out"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
