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

        const [sourceTables]: any = await source.query("SHOW TABLES");
        const [destinationTables]: any = await destination.query("SHOW TABLES");
        const sourceSchema: TableInfo[] = [];

        for (const table of sourceTables) {

            const tableName = String(Object.values(table)[0]);
            const [columns]: any = await source.query(`SHOW COLUMNS FROM \`${tableName}\``);
            const [count]: any = await source.query(`SELECT COUNT(*) total FROM \`${tableName}\``);

            sourceSchema.push({
                tableName,
                totalRows: count[0].total,
                columns
            });
        }

        const destinationSchema: TableInfo[] = [];

        for (const table of destinationTables) {
            const tableName = String(Object.values(table)[0]);
            const [columns]: any = await destination.query(`SHOW COLUMNS FROM \`${tableName}\``);
            const [count]: any = await destination.query(`SELECT COUNT(*) total FROM \`${tableName}\``);

            destinationSchema.push({
                tableName,
                totalRows: count[0].total,
                columns
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