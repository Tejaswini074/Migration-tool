import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface Props extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
}

export default function Card({ className, children, ...rest }: Props) {
    return (
        <div
            className={cn(
                "rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-colors",
                "dark:border-white/10 dark:bg-white/3 dark:shadow-none dark:backdrop-blur-sm",
                className
            )}
            {...rest}
        >
            {children}
        </div>
    );
}
