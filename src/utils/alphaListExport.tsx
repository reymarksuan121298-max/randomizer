import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { BookletBatch } from '@/types/lottery';

export async function exportAlphaList(batch: BookletBatch) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Alpha List');

    // Header
    sheet.addRow(['ALPHA LIST OF BETS']);
    sheet.addRow(['Batch:', batch.name]);
    sheet.addRow(['Date:', new Date(batch.date).toLocaleDateString()]);
    sheet.addRow([]);

    const header = sheet.addRow(['Serial Number', 'Game Type', 'Number', 'Amount', 'Date/Time']);
    header.font = { bold: true };

    // Group all bets from all booklets
    batch.booklets.forEach(booklet => {
        booklet.sheets.forEach(s => {
            s.tickets.forEach(t => {
                t.numberBets.forEach(nb => {
                    sheet.addRow([
                        t.serialNumber,
                        nb.gameTypeName,
                        nb.number,
                        nb.bet,
                        new Date(batch.date).toLocaleDateString()
                    ]);
                });
            });
        });
    });

    // Formatting
    sheet.columns = [
        { width: 20 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 20 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const data = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `AlphaList_${batch.name}.xlsx`);
}
