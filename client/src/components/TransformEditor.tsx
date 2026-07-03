import type { TransformRule, TransformType } from "../types";
import Select from "./ui/Select";
import Input from "./ui/Input";

const TYPE_LABELS: Record<TransformType, string> = {
    uppercase: "Uppercase",
    lowercase: "Lowercase",
    trim: "Trim",
    default: "Default value",
    cast_number: "Cast to number",
    cast_string: "Cast to string",
    date_format: "Format date",
    regex_replace: "Regex replace"
};

interface Props {
    value: TransformRule | null;
    onChange: (rule: TransformRule | null) => void;
}

export default function TransformEditor({ value, onChange }: Props) {
    const handleTypeChange = (next: string) => {
        if (!next) {
            onChange(null);
            return;
        }
        onChange({ type: next as TransformType });
    };

    return (
        <div className="flex flex-col gap-1.5">
            <Select value={value?.type ?? ""} onChange={(e) => handleTypeChange(e.target.value)}>
                <option value="">None</option>
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                ))}
            </Select>

            {value?.type === "default" && (
                <Input
                    placeholder="Fallback value"
                    value={value.value ?? ""}
                    onChange={(e) => onChange({ ...value, value: e.target.value })}
                />
            )}

            {value?.type === "date_format" && (
                <Input
                    placeholder="YYYY-MM-DD"
                    value={value.pattern ?? ""}
                    onChange={(e) => onChange({ ...value, pattern: e.target.value })}
                />
            )}

            {value?.type === "regex_replace" && (
                <>
                    <Input
                        placeholder="Pattern"
                        value={value.pattern ?? ""}
                        onChange={(e) => onChange({ ...value, pattern: e.target.value })}
                    />
                    <Input
                        placeholder="Replacement"
                        value={value.replacement ?? ""}
                        onChange={(e) => onChange({ ...value, replacement: e.target.value })}
                    />
                </>
            )}
        </div>
    );
}
