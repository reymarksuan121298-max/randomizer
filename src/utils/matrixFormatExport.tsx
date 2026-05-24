import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { BookletBatch } from '@/types/lottery';

export async function exportMatrixFormat(batch: BookletBatch) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Matrix Format');

    sheet.addRow(['MATRIX FORMAT REPORT']);
    sheet.addRow(['Batch:', batch.name]);
    sheet.addRow([]);

    const headers = ['Draw Time', 'Number', 'Total Sales'];
    sheet.addRow(headers);

    // Group sales by draw time and number
    const matrix: Record<string, Record<string, number>> = {};

    batch.booklets.forEach(b => {
        b.sheets.forEach(s => {
            s.tickets.forEach(t => {
                t.numberBets.forEach(nb => {
                    const time = nb.gameTypeTime || "11:00 AM";
                    if (!matrix[time]) matrix[time] = {};
                    matrix[time][nb.number] = (matrix[time][nb.number] || 0) + nb.bet;
                });
            });
        });
    });

    Object.entries(matrix).forEach(([time, nums]) => {
        Object.entries(nums).forEach(([num, bet]) => {
            sheet.addRow([time, num, bet]);
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Matrix_${batch.name}.xlsx`);
}
