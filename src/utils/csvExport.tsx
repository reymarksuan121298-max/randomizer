import type { BookletBatch } from "@/types/lottery";
import { saveAs } from "file-saver";

export function exportToCSV(batch: BookletBatch) {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Serial Number,Game Type,Number,Bet,Payout\n";

    batch.booklets.forEach(booklet => {
        booklet.sheets.forEach(sheet => {
            sheet.tickets.forEach(ticket => {
                ticket.numberBets.forEach(nb => {
                    csvContent += `${ticket.serialNumber},${nb.gameTypeName},${nb.number},${nb.bet},0\n`;
                });
            });
        });
    });

    // const encodedUri = encodeURI(csvContent);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${batch.name}_export.csv`);
}
