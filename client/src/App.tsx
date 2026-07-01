import { useState } from "react";
import { Check, Columns3, Plug, Rocket } from "lucide-react";
import ConnectionForm from "./components/ConnectionForm";
import MappingStep from "./components/MappingStep";
import MigrationStep from "./components/MigrationStep";
import AdminUsersPage from "./components/AdminUsersPage";
import Sidebar, { type View } from "./components/Sidebar";
import AuthGate from "./auth/AuthGate";
import { useAuth } from "./auth/AuthContext";
import { cn } from "./lib/cn";
import type { ConnectionState } from "./api/types";

type Step = "connect" | "mapping" | "migrate";

const steps: { key: Step; label: string; icon: typeof Plug }[] = [
    { key: "connect", label: "Connect", icon: Plug },
    { key: "mapping", label: "Map", icon: Columns3 },
    { key: "migrate", label: "Migrate", icon: Rocket }
];

function StepIndicator({ step }: { step: Step }) {
    const currentIndex = steps.findIndex((s) => s.key === step);

    return (
        <div className="mb-8 flex items-center">
            {steps.map((s, i) => {
                const isDone = i < currentIndex;
                const isActive = i === currentIndex;
                const Icon = s.icon;

                return (
                    <div key={s.key} className="flex flex-1 items-center last:flex-none">
                        <div className="flex items-center gap-2.5">
                            <div
                                className={cn(
                                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                                    isDone && "border-blue-600 bg-blue-600 text-white",
                                    isActive && "border-blue-600 bg-white text-blue-600",
                                    !isDone && !isActive && "border-slate-300 bg-white text-slate-400"
                                )}
                            >
                                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                            </div>
                            <span
                                className={cn(
                                    "text-sm font-medium",
                                    isActive || isDone ? "text-slate-900" : "text-slate-400"
                                )}
                            >
                                {s.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div
                                className={cn(
                                    "mx-4 h-0.5 flex-1",
                                    isDone ? "bg-blue-600" : "bg-slate-200"
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function MigrationWizard() {
    const [source, setSource] = useState<ConnectionState | null>(null);
    const [destination, setDestination] = useState<ConnectionState | null>(null);
    const [step, setStep] = useState<Step>("connect");
    const [projectId, setProjectId] = useState<number | null>(null);

    const bothConnected = Boolean(source && destination);

    return (
        <div>
            <StepIndicator step={step} />

            {step === "connect" && (
                <>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <ConnectionForm label="Source database" connection={source} onConnected={setSource} />
                        <ConnectionForm
                            label="Destination database"
                            connection={destination}
                            onConnected={setDestination}
                        />
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            disabled={!bothConnected}
                            onClick={() => setStep("mapping")}
                            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                        >
                            Continue to Mapping
                        </button>
                    </div>
                </>
            )}

            {step === "mapping" && source && destination && (
                <MappingStep
                    source={source}
                    destination={destination}
                    onProjectCreated={(id) => {
                        setProjectId(id);
                        setStep("migrate");
                    }}
                />
            )}

            {step === "migrate" && source && destination && projectId && (
                <MigrationStep projectId={projectId} source={source} destination={destination} />
            )}
        </div>
    );
}

function App() {
    const { user, loading, logout } = useAuth();
    const [view, setView] = useState<View>("wizard");

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-sm text-slate-500">
                Loading...
            </div>
        );
    }

    if (!user) return <AuthGate />;

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

                    {view === "admin" ? <AdminUsersPage /> : <MigrationWizard />}
                </div>
            </div>
        </div>
    );
}

export default App;
