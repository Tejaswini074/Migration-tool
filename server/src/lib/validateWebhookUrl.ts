/**
 * Basic SSRF guard for user-supplied webhook URLs: only http(s), and blocks the obvious
 * "reach something on this host/network" targets (loopback, link-local, the cloud metadata
 * IP). This checks the literal hostname only - it does not resolve DNS, so a domain that
 * *resolves* to a private IP (DNS rebinding) isn't caught. Good enough as a first line of
 * defense; a production deployment fronting untrusted users would also want to validate the
 * resolved IP at request time.
 */
const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "::1", "169.254.169.254"]);

const isLoopbackOrLinkLocalIPv4 = (host: string): boolean =>
    /^127\./.test(host) || /^169\.254\./.test(host);

export const validateWebhookUrl = (raw: string): { ok: true; url: string } | { ok: false; message: string } => {
    let parsed: URL;
    try {
        parsed = new URL(raw);
    } catch {
        return { ok: false, message: "Webhook URL is not a valid URL" };
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { ok: false, message: "Webhook URL must use http or https" };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(hostname) || isLoopbackOrLinkLocalIPv4(hostname)) {
        return { ok: false, message: "Webhook URL may not target a loopback or link-local address" };
    }

    return { ok: true, url: parsed.toString() };
};
