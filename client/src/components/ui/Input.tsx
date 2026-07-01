import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export default function Input({ label, className, id, ...rest }: Props) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className={cn(
                    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900",
                    "placeholder:text-slate-400",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                    "disabled:bg-slate-100 disabled:text-slate-400",
                    className
                )}
                {...rest}
            />
        </div>
    );
}
