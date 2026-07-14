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

/**
 * Static ReDoS heuristic: flags a quantified group (`(...)+`, `(...)*`, `(...){2,}`) whose
 * own contents contain another unbounded quantifier - the classic "nested quantifier" shape
 * behind catastrophic backtracking (e.g. `(a+)+`, `([a-zA-Z]+)*`). This doesn't execute the
 * pattern, just inspects its source, so it can't itself become a DoS vector. It's a heuristic,
 * not a full ReDoS detector - alternation-based blowups like `(a|a)+` aren't caught.
 */
/** True if `str[idx]` starts a `+`, `*`, or unbounded `{n,}` quantifier. */
const isUnboundedQuantifierAt = (str: string, idx: number): boolean => {
    if (str[idx] === "+" || str[idx] === "*") return true;
    if (str[idx] === "{") {
        const close = str.indexOf("}", idx);
        if (close === -1) return false;
        const inside = str.slice(idx + 1, close);
        return /^\d*,\s*\d*$/.test(inside) && inside.includes(",");
    }
    return false;
};

const hasNestedUnboundedQuantifier = (pattern: string): boolean => {
    const groups: { start: number; end: number }[] = [];
    const stack: number[] = [];

    for (let i = 0; i < pattern.length; i++) {
        const ch = pattern[i];
        if (ch === "\\") {
            i++;
            continue;
        }
        if (ch === "(") {
            stack.push(i);
        } else if (ch === ")") {
            const start = stack.pop();
            if (start === undefined) continue;
            if (isUnboundedQuantifierAt(pattern, i + 1)) {
                groups.push({ start, end: i });
            }
        }
    }

    for (const g of groups) {
        const inner = pattern.slice(g.start + 1, g.end);
        for (let k = 0; k < inner.length; k++) {
            if (inner[k] === "\\") {
                k++;
                continue;
            }
            if (isUnboundedQuantifierAt(inner, k)) return true;
        }
    }

    return false;
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
        if (rule.pattern.length > 200) {
            return "Regular expression pattern is too long (max 200 characters)";
        }
        try {
            new RegExp(rule.pattern);
        } catch {
            return `Invalid regular expression: ${rule.pattern}`;
        }
        if (hasNestedUnboundedQuantifier(rule.pattern)) {
            return "This pattern contains a nested repetition (e.g. \"(a+)+\") that can cause catastrophic backtracking - simplify it";
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
