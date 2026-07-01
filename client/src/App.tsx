import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-sm text-slate-500">
                Loading...
            </div>
        );
    }

    if (!user) return <LoginPage />;

    return <DashboardPage />;
}

export default App;
