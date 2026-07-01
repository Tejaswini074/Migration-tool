import { Request, Response } from "express";
import connectionManager from "../database/connectionManager";
import mappingService from "../Mapping/mapping.service";
import migrationService from "./migration.service";

export const runMigration = async (req: Request, res: Response): Promise<void> => {

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

        const runId = migrationService.start({
            project,
            sourceConnection,
            destinationConnection,
            metadataConnection
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

export const getMigrationStatus = async (req: Request, res: Response): Promise<void> => {

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
