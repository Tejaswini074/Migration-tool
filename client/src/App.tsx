import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function App() {
    const { user, loading } = useAuth();

    // No client-side router in this app - a reset-password link just carries a `token` query
    // param, checked directly so it works whether or not the visitor is already signed in.
    if (window.location.pathname === "/reset-password") {
        const token = new URLSearchParams(window.location.search).get("token");
        if (token) return <ResetPasswordPage token={token} />;
    }

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
