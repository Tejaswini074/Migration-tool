import { useState } from "react";
import Sidebar, { type View } from "../components/Sidebar";
import { useAuth } from "../hooks/useAuth";
import MigrationPage from "./MigrationPage";
import ProjectsPage from "./ProjectsPage";
import MigrationHistoryPage from "./MigrationHistoryPage";
import AdminUsersPage from "./AdminUsersPage";

const pageTitles: Record<View, { title: string; subtitle: string }> = {
    wizard: {
        title: "Migrate Data",
        subtitle: "Connect two MySQL databases, review the mapping, and run the migration."
    },
    projects: {
        title: "Projects",
        subtitle: "Your saved migration projects and their table mappings."
    },
    history: {
        title: "Migration History",
        subtitle: "Browse past migration runs and download their reports."
    },
    admin: {
        title: "User Management",
        subtitle: "Create accounts and manage access roles."
    }
};

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const [view, setView] = useState<View>("wizard");

    if (!user) return null;

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-[#08090d]">
            <Sidebar user={user} view={view} onNavigate={setView} onLogout={logout} />

            <div className="brand-glow flex-1 overflow-y-auto">
                <div className="mx-auto max-w-5xl px-8 py-8">
                    <header className="mb-8">
                        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{pageTitles[view].title}</h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{pageTitles[view].subtitle}</p>
                    </header>

                    {view === "admin" && <AdminUsersPage />}
                    {view === "history" && <MigrationHistoryPage />}
                    {view === "projects" && <ProjectsPage />}
                    {view === "wizard" && <MigrationPage />}
                </div>
            </div>
        </div>
    );
}
