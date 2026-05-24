import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { BookletBatch } from '@/types/lottery';

export async function exportPrizeUtilization(batch: BookletBatch) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Utilization');

    sheet.addRow(['PRIZE UTILIZATION REPORT']);
    sheet.addRow(['Batch:', batch.name]);
    sheet.addRow(['Total Revenue:', batch.grandTotalBets]);
    sheet.addRow(['Total Payout:', batch.totalPayout || 0]);
    sheet.addRow(['Ratio:', ((batch.totalPayout || 0) / batch.grandTotalBets * 100).toFixed(2) + '%']);
    sheet.addRow([]);

    const headers = ['Booklet', 'Revenue', 'Payout', 'Margin'];
    sheet.addRow(headers);

    batch.booklets.forEach((b, i) => {
        sheet.addRow([
            `Booklet #${i + 1}`,
            b.revenue,
            b.payout || 0,
            b.revenue - (b.payout || 0)
        ]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Utilization_${batch.name}.xlsx`);
}
