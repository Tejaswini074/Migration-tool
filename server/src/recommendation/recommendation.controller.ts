import { Request, Response } from "express";
import connectionManager from "../database/connectionManager";
import recommendationService, { TableInfo } from "./reommendation.service";

export const recommendTables = async (req: Request, res: Response) => {

    try {
        const { sourceConnectionId, destinationConnectionId } = req.body;
        const source = connectionManager.get(sourceConnectionId);
        const destination = connectionManager.get(destinationConnectionId);

        if (!source || !destination) {
            return res.status(404).json({
                success: false,
                message: "Connection Not Found"
            });
        }

        const sourceTables = await source.getTables();
        const destinationTables = await destination.getTables();

        const sourceSchema: TableInfo[] = [];
        for (const table of sourceTables) {
            sourceSchema.push({
                tableName: table.tableName,
                totalRows: table.totalRows,
                columns: await source.getColumns(table.tableName)
            });
        }

        const destinationSchema: TableInfo[] = [];
        for (const table of destinationTables) {
            destinationSchema.push({
                tableName: table.tableName,
                totalRows: table.totalRows,
                columns: await destination.getColumns(table.tableName)
            });
        }

        const recommendation = recommendationService.recommendTables(sourceSchema, destinationSchema);
        res.json({
            success: true,
            recommendation
        });
    }

    catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};