import { Response } from "express";
import connectionManager from "../database/connectionManager";
import mappingService from "../Mapping/mapping.service";
import validationService from "./validation.service";
import { AuthenticatedRequest } from "../auth/auth.middleware";

export const validateProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const { projectId, sourceConnectionId, destinationConnectionId } = req.body;

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
            res.status(400).json({ success: false, message: "Project has no table mappings to validate" });
            return;
        }

        const result = await validationService.validateProject(project, sourceConnection, destinationConnection);

        res.json({ success: true, result });

    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }

};
