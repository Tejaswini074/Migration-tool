export type TypeCategory = "numeric" | "string" | "date" | "boolean" | "binary" | "other";

/**
 * Coarse classification of a column's native type string - works for both MySQL
 * ("int", "varchar(255)", "decimal(10,2)", "datetime", "tinyint(1)", "blob") and
 * Postgres ("integer", "character varying", "timestamp without time zone", "boolean",
 * "bytea") type strings, matched by substring since exact type systems differ.
 */
export const classifyColumnType = (type: string): TypeCategory => {
    const t = type.toLowerCase();

    if (/bool/.test(t)) return "boolean";
    if (/blob|bytea|binary/.test(t)) return "binary";
    if (/date|time/.test(t)) return "date";
    if (/int|decimal|numeric|float|double|real|serial/.test(t)) return "numeric";
    if (/char|text|enum|uuid/.test(t)) return "string";
    return "other";
};

/** Whether migrating source's type into destination's type is likely to work without a bridging transform. */
export const areTypesCompatible = (sourceType: string, destinationType: string): boolean => {
    const source = classifyColumnType(sourceType);
    const destination = classifyColumnType(destinationType);
    if (source === "other" || destination === "other") return true;
    return source === destination;
};
