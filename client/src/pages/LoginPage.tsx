import { useState, type FormEvent } from "react";
import { Boxes, CheckCircle2, Database, Eye, EyeOff, Gauge, History, ShieldCheck } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { forgotPassword } from "../services/authApi";
import { extractErrorMessage } from "../services/client";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

type Mode = "login" | "signup" | "forgot";

const features = [
    {
        icon: Boxes,
        title: "Schema-aware mapping",
        description: "Auto-matches tables and columns across mismatched schemas, with a confidence score you can review."
    },
    {
        icon: Gauge,
        title: "Built for scale",
        description: "Batch processing tuned for millions of rows, ordered automatically by foreign-key dependency."
    },
    {
        icon: ShieldCheck,
        title: "Safe by default",
        description: "Every table run is validated, logged, and retryable — nothing moves without a trail."
    },
    {
        icon: History,
        title: "Full audit trail",
        description: "Every run, batch, and failure is recorded with downloadable CSV and PDF reports."
    }
];

export default function LoginPage() {
    const { needsBootstrap, openSignupEnabled, login, registerFirstAdmin, signup } = useAuth();

    const [mode, setMode] = useState<Mode>("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [forgotSent, setForgotSent] = useState(false);

    const isSignupForm = needsBootstrap || mode === "signup";

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (mode === "forgot") {
                await forgotPassword(email);
                setForgotSent(true);
            } else if (needsBootstrap) {
                await registerFirstAdmin(name, email, password);
            } else if (mode === "signup") {
                await signup(name, email, password);
            } else {
                await login(email, password);
            }
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const switchMode = (next: Mode) => {
        setMode(next);
        setError(null);
        setForgotSent(false);
    };

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-[#08090d]">
            {/* Brand panel */}
            <div className="relative hidden w-[44%] max-w-xl shrink-0 overflow-hidden bg-[#0b0c14] lg:flex lg:flex-col">
                <div
                    className="pointer-events-none absolute inset-0 opacity-40"
                    style={{
                        backgroundImage:
                            "radial-gradient(60% 50% at 20% 10%, rgba(99,102,241,0.35), transparent 60%), radial-gradient(50% 40% at 90% 90%, rgba(139,92,246,0.28), transparent 60%)"
                    }}
                />
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.07]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                        backgroundSize: "36px 36px"
                    }}
                />

                <div className="relative flex flex-1 flex-col justify-between px-12 py-12">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                            <Database className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-white">DataBridge</span>
                    </div>

                    <div>
                        <h1 className="max-w-sm text-3xl font-semibold leading-tight text-white">
                            Enterprise database migration, done right.
                        </h1>
                        <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
                            Move data between mismatched schemas at any scale — mapped, validated, and fully
                            auditable from start to finish.
                        </p>

                        <div className="mt-10 flex flex-col gap-6">
                            {features.map((f) => (
                                <div key={f.title} className="flex items-start gap-3.5">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                                        <f.icon className="h-4 w-4 text-indigo-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{f.title}</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                                            {f.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-xs text-slate-500">Migration Studio &middot; MySQL to MySQL, extensible by design</p>
                </div>
            </div>

            {/* Form panel */}
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
                <div className="w-full max-w-sm">
                    <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                            <Database className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">DataBridge</p>
                    </div>

                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        {needsBootstrap
                            ? "Create the admin account"
                            : mode === "signup"
                                ? "Create an account"
                                : mode === "forgot"
                                    ? "Reset your password"
                                    : "Welcome back"}
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                        {needsBootstrap
                            ? "No users exist yet. The first account you create becomes the administrator."
                            : mode === "signup"
                                ? "Set up your account to start mapping migrations."
                                : mode === "forgot"
                                    ? "Enter your account's email and we'll send you a reset link."
                                    : "Sign in to continue to your migration projects."}
                    </p>

                    {mode === "forgot" && forgotSent ? (
                        <div className="mt-7 flex flex-col items-center gap-3 text-center">
                            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-emerald-400" />
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                If <span className="font-medium">{email}</span> has an account, a reset link is on its way.
                            </p>
                        </div>
                    ) : (
                        <form className="mt-7 flex flex-col gap-4" onSubmit={handleSubmit}>
                            {isSignupForm && (
                                <Input
                                    label="Full name"
                                    autoComplete="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            )}
                            <Input
                                label="Email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            {mode !== "forgot" && (
                                <Input
                                    label="Password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete={isSignupForm ? "new-password" : "current-password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    rightSlot={
                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => setShowPassword((v) => !v)}
                                            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    }
                                />
                            )}

                            {mode === "login" && (
                                <button
                                    type="button"
                                    onClick={() => switchMode("forgot")}
                                    className="-mt-2 self-end text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                                >
                                    Forgot password?
                                </button>
                            )}

                            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                            <Button
                                type="submit"
                                loading={loading}
                                disabled={mode === "forgot" ? !email : !email || !password || (isSignupForm && !name)}
                                className="mt-1 w-full"
                            >
                                {needsBootstrap
                                    ? "Create admin account"
                                    : mode === "signup"
                                        ? "Create account"
                                        : mode === "forgot"
                                            ? "Send reset link"
                                            : "Sign in"}
                            </Button>
                        </form>
                    )}

                    {!needsBootstrap && (mode !== "login" || openSignupEnabled) && (
                        <button
                            type="button"
                            onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                            className="mt-5 w-full text-center text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                            {mode === "forgot"
                                ? "Back to sign in"
                                : mode === "login"
                                    ? "Need an account? Sign up"
                                    : "Already have an account? Sign in"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
