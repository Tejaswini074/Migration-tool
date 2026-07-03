import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
    primary:
        "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-500 focus-visible:ring-indigo-500 disabled:bg-indigo-400/50 disabled:shadow-none " +
        "dark:bg-indigo-500 dark:shadow-indigo-500/20 dark:hover:bg-indigo-400 dark:hover:shadow-indigo-400/30",
    secondary:
        "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400 disabled:text-slate-400 " +
        "dark:bg-white/5 dark:text-slate-200 dark:border-white/10 dark:hover:bg-white/10 dark:disabled:text-slate-500",
    danger:
        "bg-white text-red-600 border border-red-200 hover:bg-red-50 focus-visible:ring-red-400 disabled:text-red-300 " +
        "dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20",
    ghost:
        "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400 disabled:text-slate-300 " +
        "dark:text-slate-300 dark:hover:bg-white/10 dark:disabled:text-slate-600"
};

const sizeClasses: Record<Size, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm"
};

export default function Button({
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    className,
    children,
    ...rest
}: Props) {
    return (
        <button
            className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#08090d]",
                "disabled:cursor-not-allowed",
                variantClasses[variant],
                sizeClasses[size],
                className
            )}
            disabled={disabled || loading}
            {...rest}
        >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
}
