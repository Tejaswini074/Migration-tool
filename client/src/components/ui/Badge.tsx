import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Tone = "slate" | "blue" | "green" | "red" | "amber";

interface Props extends HTMLAttributes<HTMLSpanElement> {
    tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
    green: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200",
    red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
    amber: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
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
