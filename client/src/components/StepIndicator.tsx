import { Check, Columns3, Plug, Rocket } from "lucide-react";
import { cn } from "../lib/cn";

export type WizardStep = "connect" | "mapping" | "migrate";

const steps: { key: WizardStep; label: string; icon: typeof Plug }[] = [
    { key: "connect", label: "Connect", icon: Plug },
    { key: "mapping", label: "Map", icon: Columns3 },
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
