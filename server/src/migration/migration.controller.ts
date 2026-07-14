import { Response } from "express";
import connectionManager from "../database/connectionManager";
import mappingService from "../Mapping/mapping.service";
import migrationService from "./migration.service";
import runHistoryService from "./runHistory.service";
import { buildCsvReport, buildPdfReport } from "./report.service";
import { AuthenticatedRequest } from "../auth/auth.middleware";

export const runMigration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const { projectId, sourceConnectionId, destinationConnectionId, batchSize, mode } = req.body;
        const isAdmin = req.user!.role === "admin";
        const sourceConnection = connectionManager.getOwned(sourceConnectionId, req.user!.userId, isAdmin);
        const destinationConnection = connectionManager.getOwned(destinationConnectionId, req.user!.userId, isAdmin);

        if (!sourceConnection || !destinationConnection) {
            res.status(404).json({
                success: false,
                message: "One or more connections were not found"
            });
            return;
        }

        const access = await mappingService.getAccessibleProject(Number(projectId), req.user!);

        if (!access.ok) {
            res.status(access.status).json({
                success: false,
                message: access.message
            });
            return;
        }

        const project = access.project;

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
            batchSize: batchSize ? Number(batchSize) : undefined,
            mode: mode === "incremental" ? "incremental" : "full",
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

export const cancelMigration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const runId = String(req.params.runId);

        const access = await runHistoryService.getAccessibleRun(runId, req.user!);
        if (!access.ok) {
            res.status(access.status).json({ success: false, message: access.message });
            return;
        }

        const cancelled = migrationService.cancel(runId);
        if (!cancelled) {
            res.status(400).json({ success: false, message: "This run is not currently in progress" });
            return;
        }

        res.json({ success: true, message: "Cancellation requested" });

    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }

};

export const getMigrationStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const stats = await runHistoryService.getStatsForUser({
            userId: req.user!.userId,
            role: req.user!.role
        });
        res.json({ success: true, stats });

    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }

};

export const getMigrationHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const { search, page, pageSize } = req.query;
        const { items, total } = await runHistoryService.listRuns(
            { userId: req.user!.userId, role: req.user!.role },
            {
                search: search ? String(search) : undefined,
                page: page ? Number(page) : undefined,
                pageSize: pageSize ? Number(pageSize) : undefined
            }
        );
        res.json({ success: true, runs: items, total });

    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }

};

export const getFailedRows = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const runId = String(req.params.runId);
        const tableMappingId = req.query.tableMappingId ? Number(req.query.tableMappingId) : undefined;

        const access = await runHistoryService.getAccessibleRun(runId, req.user!);
        if (!access.ok) {
            res.status(access.status).json({ success: false, message: access.message });
            return;
        }

        const failedRows = await runHistoryService.getFailedRows(access.run.id, tableMappingId);
        res.json({ success: true, failedRows });

    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }

};

export const downloadReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const runId = String(req.params.runId);
        const format = String(req.query.format || "csv").toLowerCase();

        const access = await runHistoryService.getAccessibleRun(runId, req.user!);
        if (!access.ok) {
            res.status(access.status).json({ success: false, message: access.message });
            return;
        }

        const run = access.run;
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
