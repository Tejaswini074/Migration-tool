import { useState, type FormEvent } from "react";
import { Database } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { extractErrorMessage } from "../services/client";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

type Mode = "login" | "signup";

export default function LoginPage() {
    const { needsBootstrap, login, registerFirstAdmin, signup } = useAuth();

    const [mode, setMode] = useState<Mode>("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSignupForm = needsBootstrap || mode === "signup";

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (needsBootstrap) {
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

    return (
        <div className="brand-glow flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-[#08090d]">
            <div className="w-full max-w-sm">
                <div className="mb-6 flex flex-col items-center gap-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                        <Database className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">DataBridge</p>
                </div>

                <Card>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {needsBootstrap ? "Create the admin account" : mode === "signup" ? "Create an account" : "Sign in"}
                    </h2>
                    {needsBootstrap && (
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            No users exist yet. The first account you create becomes the administrator.
                        </p>
                    )}

                    <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
                        {isSignupForm && (
                            <Input label="Full name" value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        )}
                        <Input label="Email" type="email" value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <Input label="Password" type="password"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                        />

                        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                        <Button type="submit" loading={loading}
                            disabled={!email || !password || (isSignupForm && !name)}
                            className="mt-1 w-full"
                        >
                            {needsBootstrap
                                ? "Create admin account" : mode === "signup" ? "Create account"
                                    : "Sign in"}
                        </Button>
                    </form>

                    {!needsBootstrap && (
                        <button type="button"
                            onClick={() => {
                                setMode(mode === "login" ? "signup" : "login");
                                setError(null);
                            }}
                            className="mt-4 w-full text-center text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                            {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
                        </button>
                    )}
                </Card>
            </div>
        </div>
    );
}
