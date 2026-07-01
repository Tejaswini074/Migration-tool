import { Request, Response } from "express";
import mappingService from "./mapping.service";
import connectionManager from "../database/connectionManager";

const getConnectionOr404 = (connectionId: string, res: Response) => {
    const connection = connectionManager.get(connectionId);
    if (!connection) {
        res.status(404).json({
            success: false,
            message: "Connection Not Found"
        });
        return null;
    }
    return connection;
};

export const createProject = async (req: Request, res: Response): Promise<void> => {

    try {

        const { connectionId } = req.body;
        const connection = getConnectionOr404(connectionId, res);
        if (!connection) return;

        const projectId = await mappingService.createProject(connection, req.body);

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

export const getProjects = async (req: Request, res: Response): Promise<void> => {

    try {

        const connectionId = String(req.params.connectionId);
        const connection = getConnectionOr404(connectionId, res);
        if (!connection) return;

        const projects = await mappingService.getProjects(connection);

        res.json({
            success: true,
            projects
        });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }

};

export const getProjectDetail = async (req: Request, res: Response): Promise<void> => {

    try {

        const connectionId = String(req.params.connectionId);
        const projectId = Number(req.params.projectId);
        const connection = getConnectionOr404(connectionId, res);
        if (!connection) return;

        const project = await mappingService.getProjectDetail(connection, projectId);

        if (!project) {
            res.status(404).json({
                success: false,
                message: "Project Not Found"
            });
            return;
        }

        res.json({
            success: true,
            project
        });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }

};

export const saveTableMapping = async (req: Request, res: Response): Promise<void> => {

    try {

        const { connectionId } = req.body;
        const connection = getConnectionOr404(connectionId, res);
        if (!connection) return;

        const tableMappingId = await mappingService.saveTableMapping(connection, req.body);

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

export const saveColumnMapping = async (req: Request, res: Response): Promise<void> => {

    try {

        const { connectionId } = req.body;
        const connection = getConnectionOr404(connectionId, res);
        if (!connection) return;

        const columnMappingId = await mappingService.saveColumnMapping(connection, req.body);

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
