import nodemailer from "nodemailer";

/**
 * SMTP is optional, checked lazily (same pattern as CREDENTIAL_ENCRYPTION_KEY in crypto.ts) -
 * installs that never configure it shouldn't be blocked from booting. When it's not set, the
 * reset link is logged server-side instead of emailed, so forgot-password still works end to
 * end in dev; a real deployment should set SMTP_* so users actually receive the email.
 */
const isSmtpConfigured = (): boolean => Boolean(process.env.SMTP_HOST);

let transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === "true",
            auth: process.env.SMTP_USER
                ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                : undefined
        });
    }
    return transporter;
};

export const sendPasswordResetEmail = async (to: string, resetUrl: string): Promise<void> => {
    if (!isSmtpConfigured()) {
        console.warn(
            `[mailer] SMTP is not configured (SMTP_HOST unset) - password reset link for ${to}: ${resetUrl}`
        );
        return;
    }

    await getTransporter().sendMail({
        from: process.env.SMTP_FROM || "DataBridge <no-reply@databridge.local>",
        to,
        subject: "Reset your DataBridge password",
        text: `Reset your password using this link: ${resetUrl}\n\nThis link expires in 30 minutes. If you didn't request this, you can ignore this email.`,
        html: `<p>Reset your password using the link below:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>`
    });
};
