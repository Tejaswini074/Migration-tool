/**
 * Table/column names flow straight into backtick/double-quote-interpolated SQL in every
 * connector (identifiers can't be parameterized with placeholders). Restricting them to a
 * safe charset at the point they're first accepted from a client closes that off, rather
 * than trusting every call site downstream to escape correctly.
 */
const SAFE_IDENTIFIER = /^[A-Za-z0-9_]+$/;

export const isValidIdentifier = (name: unknown): name is string =>
    typeof name === "string" && name.length > 0 && name.length <= 128 && SAFE_IDENTIFIER.test(name);
