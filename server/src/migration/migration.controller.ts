import { Response } from "express";
import connectionManager from "../database/connectionManager";
import mappingService from "../Mapping/mapping.service";
import migrationService from "./migration.service";
import runHistoryService from "./runHistory.service";
import { buildCsvReport, buildPdfReport } from "./report.service";
import { AuthenticatedRequest } from "../auth/auth.middleware";

export const runMigration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {

        const { projectId, sourceConnectionId, destinationConnectionId, metadataConnectionId } = req.body;

        const sourceConnection = connectionManager.get(sourceConnectionId);
        const destinationConnection = connectionManager.get(destinationConnectionId);
        const metadataConnection = connectionManager.get(metadataConnectionId || destinationConnectionId);

        if (!sourceConnection || !destinationConnection || !metadataConnection) {
            res.status(404).json({
                success: false,
                message: "One or more connections were not found"
            });
            return;
        }

        const project = await mappingService.getProjectDetail(metadataConnection, Number(projectId));

        if (!project) {
            res.status(404).json({
                success: false,
                message: "Project Not Found"
            });
            return;
        }

        if (!project.tables || project.tables.length === 0) {
            res.status(400).json({
                success: false,
                message: "Project has no table mappings to migrate"
            });
            return;
        }

        const runId = await migrationService.start({
            project,
            sourceConnection,
            destinationConnection,
            metadataConnection,
            startedBy: {
                userId: req.user!.userId,
                name: req.user!.name,
                email: req.user!.email
            }
        });

        res.json({
            success: true,
            runId
        });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }

};

export const getMigrationStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const runId = String(req.params.runId);
        const run = migrationService.getStatus(runId);

        if (!run) {
            res.status(404).json({
                success: false,
                message: "Migration Run Not Found"
            });
            return;
        }
        res.json({
            success: true,
            run
        });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }

};

export const getMigrationHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const connectionId = String(req.params.connectionId);
        const connection = connectionManager.get(connectionId);

        if (!connection) {
            res.status(404).json({ success: false, message: "Connection Not Found" });
            return;
        }
        const runs = await runHistoryService.listRuns(connection, {
            userId: req.user!.userId,
            role: req.user!.role
        });
        res.json({ success: true, runs });

    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }

};

export const downloadReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const connectionId = String(req.params.connectionId);
        const runId = String(req.params.runId);
        const format = String(req.query.format || "csv").toLowerCase();

        const connection = connectionManager.get(connectionId);
        if (!connection) {
            res.status(404).json({ success: false, message: "Connection Not Found" });
            return;
        }
        const run = await runHistoryService.getRun(connection, runId);
        if (!run) {
            res.status(404).json({ success: false, message: "Migration Run Not Found" });
            return;
        }
        if (req.user!.role !== "admin" && run.started_by_user_id !== req.user!.userId) {
            res.status(403).json({ success: false, message: "You cannot access another user's report" });
            return;
        }

        const filenameBase = `migration-report-${run.run_id}`;

        if (format === "pdf") {
            const buffer = await buildPdfReport(run);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.pdf"`);
            res.send(buffer);
            return;
        }

        const csv = buildCsvReport(run);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.csv"`);
        res.send(csv);
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }

};
