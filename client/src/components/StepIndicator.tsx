import { Check, Columns3, Plug, Rocket, ShieldCheck } from "lucide-react";
import { cn } from "../lib/cn";

export type WizardStep = "connect" | "mapping" | "validate" | "migrate";

const steps: { key: WizardStep; label: string; icon: typeof Plug }[] = [
    { key: "connect", label: "Connect", icon: Plug },
    { key: "mapping", label: "Map", icon: Columns3 },
    { key: "validate", label: "Validate", icon: ShieldCheck },
    { key: "migrate", label: "Migrate", icon: Rocket }
];

export default function StepIndicator({ step }: { step: WizardStep }) {
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
                                    isDone && "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-400 dark:text-slate-950",
                                    isActive &&
                                    "border-indigo-600 bg-white text-indigo-600 shadow-[0_0_0_4px] shadow-indigo-500/10 dark:border-indigo-400 dark:bg-white/5 dark:text-indigo-300 dark:shadow-indigo-400/10",
                                    !isDone && !isActive && "border-slate-300 bg-white text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500"
                                )}
                            >
                                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                            </div>
                            <span
                                className={cn("text-sm font-medium",
                                    isActive || isDone ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
                                )}  >
                                {s.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div
                                className={cn(
                                    "mx-4 h-0.5 flex-1 transition-colors",
                                    isDone
                                        ? "bg-linear-to-r from-indigo-600 to-indigo-500 dark:from-indigo-400 dark:to-indigo-500"
                                        : "bg-slate-200 dark:bg-white/10"
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
