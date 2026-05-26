import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { BookletBatch } from '@/types/lottery';

export async function exportMatrixFormat(batch: BookletBatch) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Matrix Format');

    // 1. Setup columns widths
    sheet.columns = [
        { width: 18 }, // A: Draw Date
        { width: 18 }, // B: Draw Time
        { width: 25 }, // C: Ticket Serial No.
        { width: 18 }, // D: Amount of Bet
    ];

    const companyName = batch.province || "MAGUINDANAO - 5A ROYAL";
    const areaOfOp = companyName.split(' - ')[0] || companyName;
    
    // Parse Date
    const batchDate = new Date(batch.date || new Date().toISOString());
    const monthStr = batchDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }); // e.g. "May 2026"
    const drawDateStr = batchDate.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }); // e.g. "05/26/2026"

    // 2. Row 1 & 2: Main Title
    sheet.mergeCells('A2:D2');
    const titleCell = sheet.getCell('A2');
    titleCell.value = companyName.toUpperCase();
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    sheet.addRow([]); // Row 3 empty

    // 3. Info Rows Helper
    const addInfoRow = (label: string, value: string) => {
        const row = sheet.addRow([label, '', value, '']);
        const rowNum = row.number;
        sheet.mergeCells(`A${rowNum}:B${rowNum}`);
        sheet.mergeCells(`C${rowNum}:D${rowNum}`);
        
        const cA = sheet.getCell(`A${rowNum}`);
        const cC = sheet.getCell(`C${rowNum}`);
        cA.value = label;
        cC.value = value;
        
        [cA, sheet.getCell(`B${rowNum}`), cC, sheet.getCell(`D${rowNum}`)].forEach(c => {
            c.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
        cC.font = { bold: true };
    };

    addInfoRow('Name of ASA:', companyName);
    addInfoRow('Area of Operation:', areaOfOp);
    addInfoRow('Month of:', monthStr);

    // 4. Table Headers
    const headerRow = sheet.addRow(['Draw Date', 'Draw Time', 'Ticket Serial No.', 'Amount of Bet']);
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFF00' } // Yellow background
        };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // 5. Data Rows
    interface MatrixRow {
        drawDateStr: string;
        drawTime: string;
        paddedSerial: string;
        totalBet: number;
    }
    
    const rowsData: MatrixRow[] = [];

    batch.booklets.forEach(booklet => {
        booklet.sheets.forEach(sheetData => {
            sheetData.tickets.forEach(ticket => {
                const totalBet = ticket.numberBets.reduce((sum, nb) => sum + nb.bet, 0);
                if (totalBet > 0) {
                    const drawTime = ticket.numberBets[0]?.gameTypeTime || "10:30 AM";
                    const paddedSerial = String(ticket.serialNumber || "").padStart(14, '0');
                    rowsData.push({ drawDateStr, drawTime, paddedSerial, totalBet });
                }
            });
        });
    });

    // Sort by draw time A-Z
    rowsData.sort((a, b) => a.drawTime.localeCompare(b.drawTime));

    rowsData.forEach(r => {
        const row = sheet.addRow([
            r.drawDateStr,
            r.drawTime,
            r.paddedSerial,
            r.totalBet
        ]);
        
        row.eachCell((cell, colNumber) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            
            if (colNumber === 3) {
                cell.numFmt = '@'; // Treat as text to preserve leading zeros
            }
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Matrix_${(batch.name || batch.id || 'Batch').replace(/[<>:"/\\|?*]/g, '-')}.xlsx`);
}
