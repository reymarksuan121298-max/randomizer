import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { BookletBatch, Booklet } from '@/types/lottery';

export async function exportToExcel(batch: BookletBatch, booklets: Booklet[]) {
    const workbook = new ExcelJS.Workbook();
    const dateStr = new Date(batch.date).toISOString().split('T')[0];

    // 1. Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Batch Summary', batch.name]);
    summarySheet.addRow(['Date', dateStr]);
    summarySheet.addRow([]);
    summarySheet.addRow(['Booklet #', 'Revenue', 'Payout', 'Net']);

    booklets.forEach((b, idx) => {
        summarySheet.addRow([
            `Booklet ${idx + 1}`,
            b.revenue,
            b.payout || 0,
            b.revenue - (b.payout || 0)
        ]);
    });

    summarySheet.addRow([]);
    summarySheet.addRow([
        'TOTAL',
        batch.grandTotalBets,
        batch.totalPayout || 0,
        batch.grandTotalBets - (batch.totalPayout || 0)
    ]);

    // Style summary
    summarySheet.getRow(1).font = { bold: true, size: 14 };
    summarySheet.getRow(4).font = { bold: true };
    const totalRow = summarySheet.lastRow;
    if (totalRow) totalRow.font = { bold: true };

    // 2. Details Sheet
    const detailsSheet = workbook.addWorksheet('All Bets');
    detailsSheet.addRow(['Booklet', 'Sheet ID', 'Ticket', 'Game', 'Number', 'Bet Amount']);

    booklets.forEach((booklet, bIdx) => {
        booklet.sheets.forEach(sheet => {
            sheet.tickets.forEach(ticket => {
                ticket.numberBets.forEach(nb => {
                    detailsSheet.addRow([
                        `#${bIdx + 1}`,
                        sheet.id,
                        ticket.label,
                        nb.gameTypeName,
                        nb.number,
                        nb.bet
                    ]);
                });
            });
        });
    });

    // Export
    const buffer = await workbook.xlsx.writeBuffer();
    const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const EXCEL_EXTENSION = '.xlsx';
    const data = new Blob([buffer], { type: fileType });
    saveAs(data, `${(batch.name || 'Unnamed_Batch').replace(/[:\\/]/g, '-')}_Export${EXCEL_EXTENSION}`);
}
