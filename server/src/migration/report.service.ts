import PDFDocument from "pdfkit";

const csvEscape = (value: unknown): string => {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const csvRow = (values: unknown[]): string => values.map(csvEscape).join(",") + "\r\n";

const formatDuration = (startedAt: string, finishedAt: string | null): string => {
    if (!finishedAt) return "In progress";
    const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

export const buildCsvReport = (run: any): string => {

    let csv = "";
    csv += csvRow(["Migration Report"]);
    csv += csvRow(["Project", run.project_name]);
    csv += csvRow(["Source Database", run.source_database]);
    csv += csvRow(["Destination Database", run.destination_database]);
    csv += csvRow(["Started By", `${run.started_by_name} (${run.started_by_email})`]);
    csv += csvRow(["Status", run.status]);
    csv += csvRow(["Started At", run.started_at]);
    csv += csvRow(["Finished At", run.finished_at ?? "-"]);
    csv += csvRow(["Duration", formatDuration(run.started_at, run.finished_at)]);
    csv += csvRow(["Total Tables", run.tables.length]);
    csv += csvRow([
        "Total Rows Migrated",
        run.tables.reduce((sum: number, t: any) => sum + t.migrated_rows, 0)
    ]);
    csv += "\r\n";

    csv += csvRow(["Source Table", "Destination Table", "Status", "Total Rows", "Migrated Rows", "Error"]);
    for (const t of run.tables) {
        csv += csvRow([
            t.source_table,
            t.destination_table,
            t.status,
            t.total_rows,
            t.migrated_rows,
            t.error_message ?? ""
        ]);
    }

    return csv;
};

export const buildPdfReport = (run: any): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, size: "A4" });
        const chunks: Buffer[] = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        doc.fontSize(18).text("Migration Report", { underline: true });
        doc.moveDown();

        const summaryRows: [string, string][] = [
            ["Project", run.project_name],
            ["Source Database", run.source_database],
            ["Destination Database", run.destination_database],
            ["Started By", `${run.started_by_name} (${run.started_by_email})`],
            ["Status", String(run.status).toUpperCase()],
            ["Started At", String(run.started_at)],
            ["Finished At", run.finished_at ? String(run.finished_at) : "-"],
            ["Duration", formatDuration(run.started_at, run.finished_at)],
            ["Total Tables", String(run.tables.length)],
            [
                "Total Rows Migrated",
                String(run.tables.reduce((sum: number, t: any) => sum + t.migrated_rows, 0))
            ]
        ];

        doc.fontSize(10);
        summaryRows.forEach(([label, value]) => {
            doc.font("Helvetica-Bold").text(`${label}: `, { continued: true }).font("Helvetica").text(value);
        });

        doc.moveDown();
        doc.fontSize(13).font("Helvetica-Bold").text("Table Detail");
        doc.moveDown(0.5);

        const colWidths = [110, 110, 70, 70, 80, 110];
        const headers = ["Source", "Destination", "Status", "Total", "Migrated", "Error"];
        const startX = doc.x;
        let y = doc.y;

        doc.fontSize(9).font("Helvetica-Bold");
        headers.forEach((h, i) => {
            const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
            doc.text(h, x, y, { width: colWidths[i] });
        });

        y += 16;
        doc.font("Helvetica");

        for (const t of run.tables) {
            const rowValues = [
                t.source_table,
                t.destination_table,
                t.status,
                String(t.total_rows),
                String(t.migrated_rows),
                t.error_message ?? ""
            ];

            if (y > 760) {
                doc.addPage();
                y = doc.y;
            }

            rowValues.forEach((val, i) => {
                const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
                doc.text(val, x, y, { width: colWidths[i] });
            });

            y += 16;
        }

        doc.end();
    });
};
