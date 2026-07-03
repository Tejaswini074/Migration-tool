import { Response } from "express";
import connectionManager from "../database/connectionManager";
import mappingService, { canAccessProject } from "../Mapping/mapping.service";
import validationService from "./validation.service";
import { AuthenticatedRequest } from "../auth/auth.middleware";

export const validateProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const { projectId, sourceConnectionId, destinationConnectionId } = req.body;

        const sourceConnection = connectionManager.get(sourceConnectionId);
        const destinationConnection = connectionManager.get(destinationConnectionId);

        if (!sourceConnection || !destinationConnection) {
            res.status(404).json({
                success: false,
                message: "One or more connections were not found"
            });
            return;
        }

        const project = await mappingService.getProjectDetail(Number(projectId));

        if (!project) {
            res.status(404).json({ success: false, message: "Project Not Found" });
            return;
        }

        if (!canAccessProject(project, req.user!)) {
            res.status(403).json({ success: false, message: "You cannot validate another user's project" });
            return;
        }

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
