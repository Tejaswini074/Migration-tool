import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-[#08090d] dark:text-slate-400">
                Loading...
            </div>
        );
    }

    if (!user) return <LoginPage />;

    return <DashboardPage />;
}

export default App;
