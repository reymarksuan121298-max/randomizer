import type { BookletBatch } from "@/types/lottery";
import { saveAs } from "file-saver";
import { buildCsvRows } from "./excelExport";

export function exportToCSV(batch: BookletBatch) {
    const rows = buildCsvRows(batch);
    const header = [
        "Booklet",
        "Sheet",
        "Ticket",
        "Serial Number",
        "Game Type",
        "Draw Time",
        "Slot",
        "Combination",
        "Bet",
        "Payout",
    ];

    const csv = [
        header,
        ...rows.map((row) => [
            row.booklet,
            row.sheet,
            row.ticket,
            row.serial,
            row.game,
            row.time,
            row.slot,
            row.combination,
            row.bet,
            row.payout,
        ]),
    ]
        .map((row) => row.map(csvCell).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${(batch.name || batch.id || "Batch").replace(/[<>:"/\\|?*]/g, "-")}_Detailed.csv`);
}

function csvCell(value: unknown) {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}
