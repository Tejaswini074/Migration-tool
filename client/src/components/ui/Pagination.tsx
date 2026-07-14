import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "./Button";

interface Props {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ page, pageSize, total, onPageChange }: Props) {
    if (total === 0) return null;

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);

    return (
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
            <span>{start}&ndash;{end} of {total}</span>
            <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Prev
                </Button>
                <span className="text-xs">{page} / {totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
