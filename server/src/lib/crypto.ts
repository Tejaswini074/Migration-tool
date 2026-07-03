import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * Scheduled migrations are the one place DataBridge stores DB credentials at rest
 * (everywhere else connections are live-only) - checked lazily here, not at app boot,
 * so installs that never touch scheduling aren't forced to set this.
 */
const getKey = (): Buffer => {
    const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;
    if (!raw) {
        throw new Error(
            "CREDENTIAL_ENCRYPTION_KEY is not set. Generate one with " +
            "`node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"` " +
            "and add it to server/.env before creating a schedule."
        );
    }
    const key = Buffer.from(raw, "base64");
    if (key.length !== 32) {
        throw new Error("CREDENTIAL_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded).");
    }
    return key;
};

export const encrypt = (plainText: string): string => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString("base64");
};

export const decrypt = (cipherText: string): string => {
    const buffer = Buffer.from(cipherText, "base64");
    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encrypted = buffer.subarray(IV_LENGTH + 16);

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
};
