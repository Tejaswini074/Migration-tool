import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    rightSlot?: ReactNode;
}

export default function Input({ label, className, id, rightSlot, ...rest }: Props) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    id={inputId}
                    className={cn(
                        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors",
                        "placeholder:text-slate-400",
                        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
                        "disabled:bg-slate-100 disabled:text-slate-400",
                        "dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500",
                        "dark:focus:ring-indigo-400 dark:focus:bg-white/7",
                        "dark:disabled:bg-white/2 dark:disabled:text-slate-600",
                        Boolean(rightSlot) && "pr-10",
                        className
                    )}
                    {...rest}
                />
                {rightSlot && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">{rightSlot}</div>
                )}
            </div>
        </div>
    );
}
