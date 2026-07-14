import dns from "dns";

/**
 * SSRF guard for user-supplied webhook URLs: only http(s), and blocks the obvious
 * "reach something on this host/network" targets (loopback, private ranges, link-local,
 * the cloud metadata IP) - checked against both the literal hostname *and* every IP it
 * resolves to, so a domain that resolves to a private address (DNS rebinding) is caught
 * too. Call this again right before actually firing the webhook, not just at save time -
 * DNS records can change between the two.
 */
const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "::1"]);

const isBlockedIPv4 = (ip: string): boolean => {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
    const [a, b] = parts;

    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata 169.254.169.254
    if (a === 0) return true; // "this network"
    return false;
};

const isBlockedIPv6 = (ip: string): boolean => {
    const addr = ip.toLowerCase();
    if (addr === "::1" || addr === "::") return true;
    if (addr.startsWith("fc") || addr.startsWith("fd")) return true; // unique local (fc00::/7)
    if (addr.startsWith("fe8") || addr.startsWith("fe9") || addr.startsWith("fea") || addr.startsWith("feb")) return true; // link-local (fe80::/10)
    if (addr.startsWith("::ffff:")) return isBlockedIPv4(addr.slice("::ffff:".length)); // IPv4-mapped
    return false;
};

const isBlockedIp = (ip: string, family: number): boolean =>
    family === 6 ? isBlockedIPv6(ip) : isBlockedIPv4(ip);

export const validateWebhookUrl = async (
    raw: string
): Promise<{ ok: true; url: string } | { ok: false; message: string }> => {
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
    if (BLOCKED_HOSTNAMES.has(hostname) || isBlockedIPv4(hostname) || isBlockedIPv6(hostname)) {
        return { ok: false, message: "Webhook URL may not target a loopback, private, or link-local address" };
    }

    let resolved: dns.LookupAddress[];
    try {
        resolved = await dns.promises.lookup(hostname, { all: true, verbatim: true });
    } catch {
        return { ok: false, message: "Webhook URL hostname could not be resolved" };
    }

    if (resolved.some((r) => isBlockedIp(r.address, r.family))) {
        return { ok: false, message: "Webhook URL resolves to a loopback, private, or link-local address" };
    }

    return { ok: true, url: parsed.toString() };
};
