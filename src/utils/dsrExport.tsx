import ExcelJS from 'exceljs';
import type { BookletBatch } from '@/types/lottery';

export async function prepareDSRWorkbook(
    batchData: BookletBatch,
    _dsrData: any,
    companyData: any
): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Daily Sales Report');

    // Header
    sheet.mergeCells('A1:L1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'DAILY SALES REPORT';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    sheet.addRow(['Batch:', batchData.name]);
    sheet.addRow(['Date:', new Date(batchData.date).toLocaleDateString()]);
    sheet.addRow(['Company:', companyData?.name || batchData.name || 'Not configured']);
    sheet.addRow([]);

    // Table Header
    const headerRow = sheet.addRow(['Booklet #', 'Description', 'Total Sales', 'Total Payout', 'Net Sales']);
    headerRow.font = { bold: true };

    // Data
    batchData.booklets.forEach((b, idx) => {
        sheet.addRow([
            idx + 1,
            `Lottery Generation`,
            b.revenue,
            b.payout || 0,
            b.revenue - (b.payout || 0)
        ]);
    });

    sheet.addRow([]);
    const totalRow = sheet.addRow([
        'TOTALS',
        '',
        batchData.grandTotalBets,
        batchData.totalPayout || 0,
        batchData.grandTotalBets - (batchData.totalPayout || 0)
    ]);
    totalRow.font = { bold: true };

    return workbook;
}
