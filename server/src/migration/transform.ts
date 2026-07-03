export type TransformType =
    | "uppercase"
    | "lowercase"
    | "trim"
    | "default"
    | "cast_number"
    | "cast_string"
    | "date_format"
    | "regex_replace";

export interface TransformRule {
    type: TransformType;
    value?: string;
    pattern?: string;
    replacement?: string;
}

const VALID_TYPES: TransformType[] = [
    "uppercase", "lowercase", "trim", "default", "cast_number", "cast_string", "date_format", "regex_replace"
];

/** Old projects stored a bare keyword (e.g. "uppercase") instead of JSON - keep reading those. */
export const parseTransformRule = (raw?: string | null): TransformRule | null => {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && typeof parsed.type === "string") {
            return parsed as TransformRule;
        }
        return null;
    } catch {
        return { type: raw as TransformType };
    }
};

/** Validates shape before persisting - rejects unknown types and pattern strings that won't compile. */
export const validateTransformRule = (rule: TransformRule): string | null => {
    if (!VALID_TYPES.includes(rule.type)) {
        return `Unknown transform type: ${rule.type}`;
    }
    if (rule.type === "default" && !rule.value) {
        return "The \"default\" transform requires a fallback value";
    }
    if (rule.type === "date_format" && !rule.pattern) {
        return "The \"date_format\" transform requires a pattern";
    }
    if (rule.type === "regex_replace") {
        if (!rule.pattern) return "The \"regex_replace\" transform requires a pattern";
        try {
            new RegExp(rule.pattern);
        } catch {
            return `Invalid regular expression: ${rule.pattern}`;
        }
    }
    return null;
};

const formatDate = (date: Date, pattern: string): string => {
    const pad = (n: number, len = 2) => String(n).padStart(len, "0");
    return pattern
        .replace("YYYY", String(date.getFullYear()))
        .replace("MM", pad(date.getMonth() + 1))
        .replace("DD", pad(date.getDate()))
        .replace("HH", pad(date.getHours()))
        .replace("mm", pad(date.getMinutes()))
        .replace("ss", pad(date.getSeconds()));
};

export const applyTransform = (value: any, rawRule?: string | null): any => {
    const rule = parseTransformRule(rawRule);
    if (!rule) return value;

    if (value === null || value === undefined || value === "") {
        return rule.type === "default" ? rule.value : value;
    }

    switch (rule.type) {
        case "uppercase":
            return String(value).toUpperCase();
        case "lowercase":
            return String(value).toLowerCase();
        case "trim":
            return String(value).trim();
        case "default":
            return value;
        case "cast_number": {
            const num = Number(value);
            return Number.isNaN(num) ? null : num;
        }
        case "cast_string":
            return String(value);
        case "date_format": {
            const date = value instanceof Date ? value : new Date(value);
            if (Number.isNaN(date.getTime())) return value;
            return formatDate(date, rule.pattern || "YYYY-MM-DD");
        }
        case "regex_replace": {
            try {
                return String(value).replace(new RegExp(rule.pattern || "", "g"), rule.replacement || "");
            } catch {
                return value;
            }
        }
        default:
            return value;
    }
};
