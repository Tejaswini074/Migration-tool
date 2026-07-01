import { useState } from "react";
import Sidebar, { type View } from "../components/Sidebar";
import { useAuth } from "../hooks/useAuth";
import MigrationPage from "./MigrationPage";
import AdminUsersPage from "./AdminUsersPage";

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const [view, setView] = useState<View>("wizard");

    if (!user) return null;

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar user={user} view={view} onNavigate={setView} onLogout={logout} />

            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-5xl px-8 py-8">
                    <header className="mb-8">
                        <h1 className="text-2xl font-semibold text-slate-900">
                            {view === "admin" ? "User Management" : "Migrate Data"}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {view === "admin"
                                ? "Create accounts and manage access roles."
                                : "Connect two MySQL databases, review the mapping, and run the migration."}
                        </p>
                    </header>

                    {view === "admin" ? <AdminUsersPage /> : <MigrationPage />}
                </div>
            </div>
        </div>
    );
}
