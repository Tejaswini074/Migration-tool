import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Tone = "slate" | "blue" | "green" | "red" | "amber";

interface Props extends HTMLAttributes<HTMLSpanElement> {
    tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
    slate: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
    blue: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/30",
    green: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30",
    red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/30",
    amber: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30"
};

export default function Badge({ tone = "slate", children, className, ...rest }: Props) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                toneClasses[tone],
                className
            )}
            {...rest}
        >
            {children}
        </span>
    );
}
