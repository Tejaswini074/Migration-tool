import { IConnector } from "../connectors/types";

export interface TableInfo {
    tableName: string;
    totalRows: number;
    columns: any[];
}

class RecommendationService {

    private async summarizeSchema(connector: IConnector): Promise<TableInfo[]> {
        const tables = await connector.getTables();
        const summary: TableInfo[] = [];

        for (const table of tables) {
            summary.push({
                tableName: table.tableName,
                totalRows: table.totalRows,
                columns: await connector.getColumns(table.tableName)
            });
        }
        return summary;
    }

    async compareSchemas(source: IConnector, destination: IConnector) {
        const [sourceSchema, destinationSchema] = await Promise.all([
            this.summarizeSchema(source),
            this.summarizeSchema(destination)
        ]);
        return this.recommendTables(sourceSchema, destinationSchema);
    }
    private tableSimilarity(source: string, destination: string): number {
        source = source.toLowerCase();
        destination = destination.toLowerCase();
        if (source === destination)
            return 100;

        if (source.includes(destination) || destination.includes(source))
            return 90;

        const sourceWords = source.split("_");
        const destinationWords = destination.split("_");

        let matched = 0;

        sourceWords.forEach(word => {
            if (destinationWords.includes(word))
                matched++;
        });

        return Math.round(
            (matched / Math.max(sourceWords.length, destinationWords.length)) * 100
        );

    }

    private columnSimilarity(sourceColumns: any[], destinationColumns: any[]): number {

        let matched = 0;

        sourceColumns.forEach(source => {
            destinationColumns.forEach(destination => {
                const s = String(source.Field).toLowerCase();
                const d = String(destination.Field).toLowerCase();

                if (s === d || s.includes(d) || d.includes(s)) {
                    matched++;
                }
            });
        });

        return Math.round(
            (matched / Math.max(sourceColumns.length, destinationColumns.length)) * 100
        );

    }

    recommendTables(sourceTables: TableInfo[], destinationTables: TableInfo[]) {

        const recommendations = [];

        for (const source of sourceTables) {
            let bestTable: TableInfo | null = null;
            let bestScore = 0;
            let reasons: string[] = [];

            for (const destination of destinationTables) {

                const tableScore = this.tableSimilarity(source.tableName, destination.tableName);
                const columnScore = this.columnSimilarity(source.columns, destination.columns);

                const totalScore = Math.round(tableScore * 0.40 + columnScore * 0.60);

                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestTable = destination;
                    reasons = [];

                    if (tableScore > 70)
                        reasons.push("Similar table name");

                    if (columnScore > 70)
                        reasons.push("Similar columns");

                    if (
                        source.columns.length ===
                        destination.columns.length
                    )
                        reasons.push("Same number of columns");
                }
            }

            recommendations.push({
                sourceTable: source.tableName,
                destinationTable: bestTable?.tableName ?? null,
                confidence: bestScore,
                reason: reasons
            });
        }
        return recommendations;
    }

}

export default new RecommendationService();