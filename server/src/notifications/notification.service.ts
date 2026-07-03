import { getAppDatabase } from "../config/appDatabase";

export interface NotificationSettings {
    webhookUrl: string | null;
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
}

interface RunFinishedInfo {
    runId: string;
    projectName: string;
    status: "completed" | "completed_with_errors" | "failed";
    startedByUserId: number;
    totalRows: number;
    migratedRows: number;
    failedRows: number;
}

const WEBHOOK_TIMEOUT_MS = 5000;

class NotificationService {

    private async ensureTables() {
        const db = getAppDatabase();
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_notification_settings (
                user_id INT PRIMARY KEY,
                webhook_url VARCHAR(500) DEFAULT NULL,
                notify_on_success TINYINT(1) NOT NULL DEFAULT 1,
                notify_on_failure TINYINT(1) NOT NULL DEFAULT 1,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
    }

    async getSettings(userId: number): Promise<NotificationSettings> {
        await this.ensureTables();
        const db = getAppDatabase();

        const [rows]: any = await db.query(
            "SELECT webhook_url, notify_on_success, notify_on_failure FROM user_notification_settings WHERE user_id = ?",
            [userId]
        );

        if (!rows[0]) {
            return { webhookUrl: null, notifyOnSuccess: true, notifyOnFailure: true };
        }
        return {
            webhookUrl: rows[0].webhook_url,
            notifyOnSuccess: Boolean(rows[0].notify_on_success),
            notifyOnFailure: Boolean(rows[0].notify_on_failure)
        };
    }

    async updateSettings(userId: number, settings: NotificationSettings): Promise<void> {
        await this.ensureTables();
        const db = getAppDatabase();

        await db.execute(
            `INSERT INTO user_notification_settings (user_id, webhook_url, notify_on_success, notify_on_failure)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                webhook_url = VALUES(webhook_url),
                notify_on_success = VALUES(notify_on_success),
                notify_on_failure = VALUES(notify_on_failure)`,
            [userId, settings.webhookUrl || null, settings.notifyOnSuccess ? 1 : 0, settings.notifyOnFailure ? 1 : 0]
        );
    }

    /**
     * Best-effort: a webhook failing must never break a migration run, so every error
     * here is caught and logged, never thrown.
     */
    async notifyRunFinished(run: RunFinishedInfo): Promise<void> {
        try {
            const settings = await this.getSettings(run.startedByUserId);
            if (!settings.webhookUrl) return;

            const succeeded = run.status !== "failed";
            if (succeeded && !settings.notifyOnSuccess) return;
            if (!succeeded && !settings.notifyOnFailure) return;

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

            try {
                await fetch(settings.webhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        event: "migration.run.finished",
                        runId: run.runId,
                        projectName: run.projectName,
                        status: run.status,
                        totalRows: run.totalRows,
                        migratedRows: run.migratedRows,
                        failedRows: run.failedRows,
                        finishedAt: new Date().toISOString()
                    }),
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeout);
            }
        } catch (err: any) {
            console.error(`Webhook notification failed for run ${run.runId}:`, err.message);
        }
    }

}

export default new NotificationService();
