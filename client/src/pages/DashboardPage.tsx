import { useState } from "react";
import { ArrowRightLeft, CalendarClock, FolderKanban, History, LayoutDashboard, Settings, Users } from "lucide-react";
import Sidebar, { type View } from "../components/Sidebar";
import { useAuth } from "../hooks/useAuth";
import OverviewPage from "./OverviewPage";
import MigrationPage from "./MigrationPage";
import ProjectsPage from "./ProjectsPage";
import MigrationHistoryPage from "./MigrationHistoryPage";
import SchedulesPage from "./SchedulesPage";
import SettingsPage from "./SettingsPage";
import AdminUsersPage from "./AdminUsersPage";

const pageTitles: Record<View, { title: string; subtitle: string; icon: typeof ArrowRightLeft }> = {
    overview: {
        title: "Overview",
        subtitle: "Your migration activity at a glance.",
        icon: LayoutDashboard
    },
    wizard: {
        title: "Migrate Data",
        subtitle: "Connect two MySQL databases, review the mapping, and run the migration.",
        icon: ArrowRightLeft
    },
    projects: {
        title: "Projects",
        subtitle: "Your saved migration projects and their table mappings.",
        icon: FolderKanban
    },
    history: {
        title: "Migration History",
        subtitle: "Browse past migration runs and download their reports.",
        icon: History
    },
    schedules: {
        title: "Schedules",
        subtitle: "Run your migration projects automatically on a recurring basis.",
        icon: CalendarClock
    },
    settings: {
        title: "Settings",
        subtitle: "Manage webhook notifications for your migration runs.",
        icon: Settings
    },
    admin: {
        title: "User Management",
        subtitle: "Create accounts and manage access roles.",
        icon: Users
    }
};

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const [view, setView] = useState<View>("overview");

    if (!user) return null;

    const Icon = pageTitles[view].icon;

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-[#08090d]">
            <Sidebar user={user} view={view} onNavigate={setView} onLogout={logout} />

            <div className="brand-glow flex-1 overflow-y-auto">
                <div className="mx-auto max-w-6xl px-8 py-8">
                    <header className="mb-8 flex items-center gap-4 border-b border-slate-200 pb-6 dark:border-white/10">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500/10 to-violet-500/10 ring-1 ring-indigo-500/15 dark:ring-indigo-400/20">
                            <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{pageTitles[view].title}</h1>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{pageTitles[view].subtitle}</p>
                        </div>
                    </header>

                    {view === "overview" && <OverviewPage onNavigate={setView} />}
                    {view === "admin" && <AdminUsersPage />}
                    {view === "history" && <MigrationHistoryPage />}
                    {view === "projects" && <ProjectsPage />}
                    {view === "schedules" && <SchedulesPage />}
                    {view === "settings" && <SettingsPage />}
                    {view === "wizard" && <MigrationPage />}
                </div>
            </div>
        </div>
    );
}
