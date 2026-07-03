import { IConnector } from "../connectors/types";
import { resolveTableOrder } from "../migration/dependencyOrder";

export interface ValidationIssue {
    severity: "error" | "warning";
    message: string;
}

export interface TableValidationResult {
    tableMappingId: number;
    sourceTable: string;
    destinationTable: string;
    issues: ValidationIssue[];
}

export interface ProjectValidationResult {
    tables: TableValidationResult[];
    errorCount: number;
    warningCount: number;
}

class ValidationService {

    async validateProject(
        project: any,
        sourceConnection: IConnector,
        destinationConnection: IConnector
    ): Promise<ProjectValidationResult> {

        const results: TableValidationResult[] = [];
        const mappedDestTables = new Set(project.tables.map((t: any) => t.destination_table));

        const { hasCycle, cycleTables } = await resolveTableOrder(project.tables, destinationConnection);

        for (const table of project.tables) {
            const issues: ValidationIssue[] = [];

            if (!table.columns || table.columns.length === 0) {
                issues.push({
                    severity: "error",
                    message: "No columns are mapped for this table."
                });
                results.push({
                    tableMappingId: table.id,
                    sourceTable: table.source_table,
                    destinationTable: table.destination_table,
                    issues
                });
                continue;
            }

            const destColumns = await destinationConnection.getColumns(table.destination_table);
            const mappedDestCols = new Set(table.columns.map((c: any) => c.destination_column));

            for (const col of destColumns) {
                const isRequired = col.Null === "NO" && col.Extra !== "auto_increment" && col.Default === null;
                if (isRequired && !mappedDestCols.has(col.Field)) {
                    issues.push({
                        severity: "error",
                        message: `Destination column "${col.Field}" is required (NOT NULL, no default) but has no source mapping.`
                    });
                }
            }

            for (const col of table.columns) {
                const destColInfo = destColumns.find((d: any) => d.Field === col.destination_column);
                if (!destColInfo) continue;

                if (destColInfo.Null === "NO" && destColInfo.Extra !== "auto_increment") {
                    const nullCount = await sourceConnection.countNulls(table.source_table, col.source_column);
                    if (nullCount > 0) {
                        issues.push({
                            severity: "error",
                            message: `Source column "${col.source_column}" has ${nullCount} NULL value(s), but destination column "${col.destination_column}" does not allow NULL.`
                        });
                    }
                }

                if (destColInfo.Key === "PRI" || destColInfo.Key === "UNI") {
                    const dupeCount = await sourceConnection.countDuplicateValues(table.source_table, col.source_column);
                    if (dupeCount > 0) {
                        issues.push({
                            severity: "error",
                            message: `Source column "${col.source_column}" has ${dupeCount} duplicate value(s), but destination column "${col.destination_column}" must be unique.`
                        });
                    }
                }
            }

            const destFks = await destinationConnection.getForeignKeys(table.destination_table);
            for (const fk of destFks) {
                if (fk.REFERENCED_TABLE_NAME !== table.destination_table && !mappedDestTables.has(fk.REFERENCED_TABLE_NAME)) {
                    issues.push({
                        severity: "warning",
                        message: `Destination table has a foreign key to "${fk.REFERENCED_TABLE_NAME}", which is not part of this migration project. Rows may fail unless matching parent rows already exist in the destination.`
                    });
                }
            }

            if (hasCycle && cycleTables.includes(table.destination_table)) {
                issues.push({
                    severity: "error",
                    message: "This table is part of a circular foreign-key dependency with other mapped tables, so a safe insert order can't be determined automatically."
                });
            }

            results.push({
                tableMappingId: table.id,
                sourceTable: table.source_table,
                destinationTable: table.destination_table,
                issues
            });
        }

        const errorCount = results.reduce((sum, t) => sum + t.issues.filter((i) => i.severity === "error").length, 0);
        const warningCount = results.reduce((sum, t) => sum + t.issues.filter((i) => i.severity === "warning").length, 0);

        return { tables: results, errorCount, warningCount };
    }
}

export default new ValidationService();
