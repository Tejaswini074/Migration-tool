import cron, { ScheduledTask } from "node-cron";
import { v4 as uuid } from "uuid";
import { getAppDatabase } from "../config/appDatabase";
import mappingService from "../Mapping/mapping.service";
import migrationService from "../migration/migration.service";
import connectionManager from "../database/connectionManager";
import { createConnector } from "../connectors/connectorFactory";
import { ConnectionConfig } from "../connectors/types";
import { encrypt, decrypt } from "../lib/crypto";

interface Requester {
    userId: number;
    role: string;
    name: string;
}

export class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

const RUN_POLL_INTERVAL_MS = 2000;
const RUN_POLL_TIMEOUT_MS = 30 * 60 * 1000;

class ScheduleService {

    private cronTasks: Map<number, ScheduledTask> = new Map();

    private async ensureTables() {
        const db = getAppDatabase();
        await db.query(`
            CREATE TABLE IF NOT EXISTS migration_schedules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                cron_expression VARCHAR(100) NOT NULL,
                mode VARCHAR(20) NOT NULL DEFAULT 'full',
                batch_size INT NOT NULL DEFAULT 500,
                source_config_encrypted TEXT NOT NULL,
                destination_config_encrypted TEXT NOT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_by_user_id INT NOT NULL,
                created_by_name VARCHAR(255) NOT NULL,
                last_run_at TIMESTAMP NULL,
                last_run_status VARCHAR(40) NULL,
                next_run_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES migration_projects(id) ON DELETE CASCADE
            )
        `);
    }

    private registerCronJob(schedule: any) {
        const existing = this.cronTasks.get(schedule.id);
        if (existing) {
            existing.stop();
            this.cronTasks.delete(schedule.id);
        }
        if (!schedule.is_active) return;

        const task = cron.schedule(schedule.cron_expression, () => {
            this.executeScheduledRun(schedule.id);
        });
        this.cronTasks.set(schedule.id, task);
    }

    private async getOwnedSchedule(id: number, requester: Requester) {
        await this.ensureTables();
        const db = getAppDatabase();
        const [rows]: any = await db.query("SELECT * FROM migration_schedules WHERE id = ?", [id]);
        const schedule = rows[0];

        if (!schedule) throw new HttpError(404, "Schedule not found");
        if (requester.role !== "admin" && schedule.created_by_user_id !== requester.userId) {
            throw new HttpError(403, "You cannot access another user's schedule");
        }
        return schedule;
    }

    private waitForRunCompletion(runId: string): Promise<string> {
        return new Promise((resolve) => {
            const startedAt = Date.now();
            const poll = setInterval(() => {
                const run = migrationService.getStatus(runId);
                if (!run || run.status !== "running" || Date.now() - startedAt > RUN_POLL_TIMEOUT_MS) {
                    clearInterval(poll);
                    resolve(run?.status || "failed");
                }
            }, RUN_POLL_INTERVAL_MS);
        });
    }

    private async executeScheduledRun(scheduleId: number) {
        const db = getAppDatabase();
        const [rows]: any = await db.query("SELECT * FROM migration_schedules WHERE id = ?", [scheduleId]);
        const schedule = rows[0];
        if (!schedule || !schedule.is_active) return;

        let sourceConnectionId = "";
        let destinationConnectionId = "";

        try {
            const sourceConfig: ConnectionConfig = JSON.parse(decrypt(schedule.source_config_encrypted));
            const destinationConfig: ConnectionConfig = JSON.parse(decrypt(schedule.destination_config_encrypted));

            const sourceConnector = createConnector(sourceConfig);
            const destinationConnector = createConnector(destinationConfig);
            await sourceConnector.testConnection();
            await destinationConnector.testConnection();

            sourceConnectionId = uuid();
            destinationConnectionId = uuid();
            connectionManager.add(sourceConnectionId, sourceConnector, schedule.created_by_user_id);
            connectionManager.add(destinationConnectionId, destinationConnector, schedule.created_by_user_id);

            const project = await mappingService.getProjectDetail(schedule.project_id);
            if (!project) throw new Error("Project no longer exists");

            const runId = await migrationService.start({
                project,
                sourceConnection: sourceConnector,
                destinationConnection: destinationConnector,
                startedBy: { userId: schedule.created_by_user_id, name: schedule.created_by_name, email: "" },
                batchSize: schedule.batch_size,
                mode: schedule.mode
            });

            const finalStatus = await this.waitForRunCompletion(runId);

            await db.execute(
                "UPDATE migration_schedules SET last_run_at = CURRENT_TIMESTAMP, last_run_status = ? WHERE id = ?",
                [finalStatus, scheduleId]
            );
        } catch (err: any) {
            console.error(`Scheduled run failed for schedule ${scheduleId}:`, err.message);
            await db.execute(
                "UPDATE migration_schedules SET last_run_at = CURRENT_TIMESTAMP, last_run_status = 'failed' WHERE id = ?",
                [scheduleId]
            );
        } finally {
            for (const connectionId of [sourceConnectionId, destinationConnectionId]) {
                if (!connectionId) continue;
                const connector = connectionManager.get(connectionId);
                if (connector) await connector.close().catch(() => {});
                connectionManager.remove(connectionId);
            }
        }
    }

    async createSchedule(
        data: {
            projectId: number;
            cronExpression: string;
            mode: "full" | "incremental";
            batchSize?: number;
            source: ConnectionConfig;
            destination: ConnectionConfig;
        },
        requester: Requester
    ) {
        if (!cron.validate(data.cronExpression)) {
            throw new HttpError(400, "Invalid cron expression");
        }

        const access = await mappingService.getAccessibleProject(data.projectId, requester);
        if (!access.ok) {
            throw new HttpError(access.status, access.message);
        }

        await this.ensureTables();
        const db = getAppDatabase();

        const [result]: any = await db.execute(
            `INSERT INTO migration_schedules
             (project_id, cron_expression, mode, batch_size, source_config_encrypted, destination_config_encrypted, is_active, created_by_user_id, created_by_name)
             VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [
                data.projectId,
                data.cronExpression,
                data.mode || "full",
                data.batchSize || 500,
                encrypt(JSON.stringify(data.source)),
                encrypt(JSON.stringify(data.destination)),
                requester.userId,
                requester.name
            ]
        );

        const scheduleId = result.insertId;
        const [rows]: any = await db.query("SELECT * FROM migration_schedules WHERE id = ?", [scheduleId]);
        this.registerCronJob(rows[0]);

        return scheduleId;
    }

    async listSchedules(requester: Requester) {
        await this.ensureTables();
        const db = getAppDatabase();
        const isAdmin = requester.role === "admin";

        // Never select the encrypted credential columns back out to the client.
        const columns = `id, project_id, cron_expression, mode, batch_size, is_active,
            created_by_user_id, created_by_name, last_run_at, last_run_status, next_run_at, created_at`;

        const [rows]: any = await db.query(
            isAdmin
                ? `SELECT ${columns} FROM migration_schedules ORDER BY created_at DESC`
                : `SELECT ${columns} FROM migration_schedules WHERE created_by_user_id = ? ORDER BY created_at DESC`,
            isAdmin ? [] : [requester.userId]
        );
        return rows;
    }

    async toggleSchedule(id: number, isActive: boolean, requester: Requester) {
        const schedule = await this.getOwnedSchedule(id, requester);
        const db = getAppDatabase();
        await db.execute("UPDATE migration_schedules SET is_active = ? WHERE id = ?", [isActive ? 1 : 0, id]);
        schedule.is_active = isActive ? 1 : 0;
        this.registerCronJob(schedule);
    }

    async deleteSchedule(id: number, requester: Requester) {
        await this.getOwnedSchedule(id, requester);
        const db = getAppDatabase();
        await db.execute("DELETE FROM migration_schedules WHERE id = ?", [id]);

        const task = this.cronTasks.get(id);
        if (task) {
            task.stop();
            this.cronTasks.delete(id);
        }
    }

    async runScheduleNow(id: number, requester: Requester) {
        await this.getOwnedSchedule(id, requester);
        this.executeScheduledRun(id);
    }

    /** Reloads active schedules and re-registers their cron jobs - call once at server startup. */
    async initSchedules() {
        await this.ensureTables();
        const db = getAppDatabase();
        const [rows]: any = await db.query("SELECT * FROM migration_schedules WHERE is_active = 1");

        for (const schedule of rows) {
            this.registerCronJob(schedule);
        }
        console.log(`Loaded ${rows.length} active migration schedule(s)`);
    }

}

export default new ScheduleService();
