import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
}

export default function Select({ label, className, id, children, ...rest }: Props) {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label htmlFor={selectId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    id={selectId}
                    className={cn(
                        "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-900 transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
                        "disabled:bg-slate-100 disabled:text-slate-400",
                        "dark:border-white/10 dark:bg-white/5 dark:text-slate-100",
                        "dark:focus:ring-indigo-400 dark:disabled:bg-white/2 dark:disabled:text-slate-600",
                        "dark:[&>option]:bg-slate-900",
                        className
                    )}
                    {...rest}
                >
                    {children}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            </div>
        </div>
    );
}
