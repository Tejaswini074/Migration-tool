import { Response } from "express";
import mappingService, { canAccessProject } from "./mapping.service";
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
        const projects = await mappingService.getProjects({
            userId: req.user!.userId,
            role: req.user!.role
        });
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

export const getProjectDetail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const projectId = Number(req.params.projectId);
        const project = await mappingService.getProjectDetail(projectId);

        if (!project) {
            res.status(404).json({
                success: false,
                message: "Project Not Found"
            });
            return;
        }

        if (!canAccessProject(project, req.user!)) {
            res.status(403).json({
                success: false,
                message: "You cannot access another user's project"
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

export const saveTableMapping = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const project = await mappingService.getProjectDetail(Number(req.body.projectId));

        if (!project || !canAccessProject(project, req.user!)) {
            res.status(404).json({
                success: false,
                message: "Project Not Found"
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
