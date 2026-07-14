import { useState, type FormEvent } from "react";
import { CheckCircle2, Database } from "lucide-react";
import { resetPassword } from "../services/authApi";
import { extractErrorMessage } from "../services/client";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function ResetPasswordPage({ token }: { token: string }) {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 8) {
            setError("New password must be at least 8 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        setLoading(true);
        try {
            await resetPassword(token, newPassword);
            setDone(true);
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-[#08090d]">
            <div className="w-full max-w-sm">
                <div className="mb-8 flex flex-col items-center gap-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                        <Database className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">DataBridge</p>
                </div>

                {done ? (
                    <div className="flex flex-col items-center gap-3 text-center">
                        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-emerald-400" />
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Password updated</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Your password has been reset. You can sign in with it now.
                        </p>
                        <Button className="mt-2 w-full" onClick={() => { window.location.href = "/"; }}>
                            Go to sign in
                        </Button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Set a new password</h2>
                        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                            Choose a new password for your account.
                        </p>

                        <form className="mt-7 flex flex-col gap-4" onSubmit={handleSubmit}>
                            <Input
                                label="New password"
                                type="password"
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <Input
                                label="Confirm new password"
                                type="password"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />

                            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                            <Button
                                type="submit"
                                loading={loading}
                                disabled={!newPassword || !confirmPassword}
                                className="mt-1 w-full"
                            >
                                Reset password
                            </Button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
