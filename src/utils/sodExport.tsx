import ExcelJS from 'exceljs';
import type { BookletBatch } from '@/types/lottery';

export async function prepareSODWorkbook(
    batchData: BookletBatch,
    companyData: any
): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Statement of Draw');

    sheet.addRow(['STATEMENT OF DRAW']);
    sheet.addRow(['Company:', companyData?.name || 'ADS']);
    sheet.addRow(['Date:', new Date(batchData.date).toLocaleDateString()]);
    sheet.addRow([]);

    const header = sheet.addRow(['Sheet ID', 'Total Bets', 'Status']);
    header.font = { bold: true };

    batchData.booklets[0]?.sheets.forEach(s => {
        sheet.addRow([
            s.id,
            s.tickets.reduce((sum, t) => sum + t.numberBets.reduce((sb, nb) => sb + nb.bet, 0), 0),
            'COMPLETED'
        ]);
    });

    return workbook;
}
