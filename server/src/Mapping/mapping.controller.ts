import { Response } from "express";
import mappingService from "./mapping.service";
import connectionManager from "../database/connectionManager";
import { parseTransformRule, validateTransformRule } from "../migration/transform";
import { isValidIdentifier } from "../lib/validateIdentifier";
import { AuthenticatedRequest } from "../auth/auth.middleware";

export const createProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const projectId = await mappingService.createProject(req.body, {
            userId: req.user!.userId,
            name: req.user!.name,
            email: req.user!.email
        });

        res.json({
            success: true,
            projectId
        });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }

};

export const getProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const { search, page, pageSize } = req.query;
        const { items, total } = await mappingService.getProjects(
            { userId: req.user!.userId, role: req.user!.role },
            {
                search: search ? String(search) : undefined,
                page: page ? Number(page) : undefined,
                pageSize: pageSize ? Number(pageSize) : undefined
            }
        );
        res.json({
            success: true,
            projects: items,
            total
        });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }

};

export const getProjectDetail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const projectId = Number(req.params.projectId);
        const access = await mappingService.getAccessibleProject(projectId, req.user!);

        if (!access.ok) {
            res.status(access.status).json({
                success: false,
                message: access.message
            });
            return;
        }

        res.json({
            success: true,
            project: access.project
        });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }

};

export const deleteProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const projectId = Number(req.params.projectId);
        const access = await mappingService.getAccessibleProject(projectId, req.user!);

        if (!access.ok) {
            res.status(access.status).json({
                success: false,
                message: access.message
            });
            return;
        }

        await mappingService.deleteProject(projectId);

        res.json({ success: true });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }

};

export const saveTableMapping = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        if (!isValidIdentifier(req.body.sourceTable) || !isValidIdentifier(req.body.destinationTable)) {
            res.status(400).json({ success: false, message: "Table names must be alphanumeric/underscore only" });
            return;
        }

        const access = await mappingService.getAccessibleProject(Number(req.body.projectId), req.user!);

        if (!access.ok) {
            res.status(access.status).json({
                success: false,
                message: access.message
            });
            return;
        }

        const tableMappingId = await mappingService.saveTableMapping(req.body);

        res.json({
            success: true,
            tableMappingId
        });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }

};

export const saveColumnMapping = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const { sourceColumn, destinationColumn, lookupTable, lookupColumn } = req.body;
        if (
            !isValidIdentifier(sourceColumn) || !isValidIdentifier(destinationColumn) ||
            (lookupTable && !isValidIdentifier(lookupTable)) ||
            (lookupColumn && !isValidIdentifier(lookupColumn))
        ) {
            res.status(400).json({ success: false, message: "Column/table names must be alphanumeric/underscore only" });
            return;
        }

        const access = await mappingService.getAccessibleTableMapping(Number(req.body.tableMappingId), req.user!);
        if (!access.ok) {
            res.status(access.status).json({
                success: false,
                message: access.message
            });
            return;
        }

        const rule = parseTransformRule(req.body.transformRule);
        if (rule) {
            const validationError = validateTransformRule(rule);
            if (validationError) {
                res.status(400).json({ success: false, message: validationError });
                return;
            }
        }

        const columnMappingId = await mappingService.saveColumnMapping(req.body);

        res.json({
            success: true,
            columnMappingId
        });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }

};

export const setHighWaterColumn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const tableMappingId = Number(req.params.tableMappingId);

        const access = await mappingService.getAccessibleTableMapping(tableMappingId, req.user!);
        if (!access.ok) {
            res.status(access.status).json({
                success: false,
                message: access.message
            });
            return;
        }

        const { column } = req.body;
        if (column && !isValidIdentifier(column)) {
            res.status(400).json({ success: false, message: "Column name must be alphanumeric/underscore only" });
            return;
        }

        await mappingService.setHighWaterColumn(tableMappingId, column || null);

        res.json({ success: true });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }

};

export const previewMapping = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const { sourceConnectionId, tableName, columns } = req.body;

        if (!tableName || !Array.isArray(columns) || columns.length === 0) {
            res.status(400).json({
                success: false,
                message: "tableName and at least one column mapping are required"
            });
            return;
        }

        if (
            !isValidIdentifier(tableName) ||
            columns.some((c) => !isValidIdentifier(c.sourceColumn) || !isValidIdentifier(c.destinationColumn))
        ) {
            res.status(400).json({ success: false, message: "Table/column names must be alphanumeric/underscore only" });
            return;
        }

        const sourceConnection = connectionManager.getOwned(sourceConnectionId, req.user!.userId, req.user!.role === "admin");
        if (!sourceConnection) {
            res.status(404).json({ success: false, message: "Source connection not found" });
            return;
        }

        for (const col of columns) {
            const rule = parseTransformRule(col.transformRule);
            if (rule) {
                const validationError = validateTransformRule(rule);
                if (validationError) {
                    res.status(400).json({ success: false, message: validationError });
                    return;
                }
            }
        }

        const rows = await mappingService.previewMapping(sourceConnection, tableName, columns);

        res.json({ success: true, rows });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }

};
