import { CheckCircle2, Webhook } from "lucide-react";
import { useNotificationSettings } from "../hooks/useNotificationSettings";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function SettingsPage() {
    const { settings, setSettings, loading, saving, error, saved, save } = useNotificationSettings();

    if (loading) {
        return <p className="text-sm text-slate-500 dark:text-slate-400">Loading settings...</p>;
    }

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                        <Webhook className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Webhook notifications</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Get a POST request when your migration runs finish.
                        </p>
                    </div>
                </div>

                <form
                    className="flex flex-col gap-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        save();
                    }}
                >
                    <Input
                        label="Webhook URL"
                        type="url"
                        placeholder="https://hooks.slack.com/services/..."
                        value={settings.webhookUrl ?? ""}
                        onChange={(e) => setSettings((s) => ({ ...s, webhookUrl: e.target.value }))}
                    />

                    <label className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                        <input
                            type="checkbox"
                            checked={settings.notifyOnSuccess}
                            onChange={(e) => setSettings((s) => ({ ...s, notifyOnSuccess: e.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20 dark:bg-white/5"
                        />
                        Notify when a run completes successfully
                    </label>
                    <label className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                        <input
                            type="checkbox"
                            checked={settings.notifyOnFailure}
                            onChange={(e) => setSettings((s) => ({ ...s, notifyOnFailure: e.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20 dark:bg-white/5"
                        />
                        Notify when a run fails
                    </label>

                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                    <div className="flex items-center gap-3">
                        <Button type="submit" loading={saving} className="w-fit">
                            Save
                        </Button>
                        {saved && !saving && (
                            <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" />
                                Saved
                            </span>
                        )}
                    </div>
                </form>
            </Card>
        </div>
    );
}
