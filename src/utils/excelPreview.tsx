import ExcelJS from 'exceljs';

export interface CellStyle {
    font?: {
        bold?: boolean;
        italic?: boolean;
        size?: number;
        color?: string;
    };
    fill?: {
        type: 'pattern';
        pattern: 'solid';
        fgColor: string;
    };
    border?: {
        top?: { style: string; color?: string };
        bottom?: { style: string; color?: string };
        left?: { style: string; color?: string };
        right?: { style: string; color?: string };
    };
    alignment?: {
        horizontal?: 'left' | 'center' | 'right';
        vertical?: 'top' | 'middle' | 'bottom';
        wrapText?: boolean;
    };
    numFmt?: string;
}

export interface PreviewCell {
    value: any;
    style: CellStyle;
    isMerged?: boolean;
    mergeStart?: { row: number; col: number };
    mergeEnd?: { row: number; col: number };
    rowSpan?: number;
    colSpan?: number;
}

export interface PreviewImage {
    imageId: string;
    base64: string;
    extension: string;
    position: {
        col: number;
        row: number;
    };
    size: {
        width: number;
        height: number;
    };
}

export interface PreviewSheet {
    name: string;
    rows: PreviewCell[][];
    columnWidths: number[];
    rowHeights: number[];
    images: PreviewImage[];
}

export interface ExcelPreviewData {
    sheets: PreviewSheet[];
}

/**
 * Convert ExcelJS workbook to preview data structure
 */
export function workbookToPreviewData(workbook: ExcelJS.Workbook): ExcelPreviewData {
    const sheets: PreviewSheet[] = [];

    workbook.eachSheet((worksheet) => {
        const rows: PreviewCell[][] = [];
        const columnWidths: number[] = [];
        const rowHeights: number[] = [];
        const images: PreviewImage[] = [];

        // Get column widths
        worksheet.columns.forEach((col: any) => {
            columnWidths.push(col.width || 10);
        });

        // Extract images
        const worksheetModel = (worksheet as any).model;
        if (worksheetModel && worksheetModel.media) {
            worksheetModel.media.forEach((media: any) => {
                const imageData = workbook.model.media.find((m: any) => m.index === media.imageId);
                if (imageData) {
                    images.push({
                        imageId: media.imageId,
                        base64: imageData.buffer ? bufferToBase64(imageData.buffer, imageData.extension) : '',
                        extension: imageData.extension || 'png',
                        position: {
                            col: media.range?.tl?.nativeCol || 0,
                            row: media.range?.tl?.nativeRow || 0,
                        },
                        size: {
                            width: media.range?.ext?.width || 80,
                            height: media.range?.ext?.height || 80,
                        },
                    });
                }
            });
        }

        // Track merged cells
        const mergedCells = new Map<string, { start: { row: number; col: number }; end: { row: number; col: number } }>();

        if (worksheet.model && worksheet.model.merges) {
            worksheet.model.merges.forEach((merge: string) => {
                const [startCell, endCell] = merge.split(':');
                const startAddr = parseCellAddress(startCell);
                const endAddr = endCell ? parseCellAddress(endCell) : startAddr;

                for (let row = startAddr.row; row <= endAddr.row; row++) {
                    for (let col = startAddr.col; col <= endAddr.col; col++) {
                        const key = `${row}-${col}`;
                        mergedCells.set(key, { start: startAddr, end: endAddr });
                    }
                }
            });
        }

        // Process each row
        worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
            const rowCells: PreviewCell[] = [];
            const rowHeight = (row as any).height || 15;
            rowHeights.push(rowHeight);

            // Process each cell in row
            const maxCol = Math.max(columnWidths.length, (row as any).cellCount || 0);
            for (let colNumber = 1; colNumber <= maxCol; colNumber++) {
                const cell = row.getCell(colNumber);
                const key = `${rowNumber}-${colNumber}`;
                const merge = mergedCells.get(key);

                const previewCell: PreviewCell = {
                    value: getCellDisplayValue(cell),
                    style: extractCellStyle(cell),
                };

                // Handle merged cells
                if (merge) {
                    const isStartCell = merge.start.row === rowNumber && merge.start.col === colNumber;
                    previewCell.isMerged = true;
                    previewCell.mergeStart = merge.start;
                    previewCell.mergeEnd = merge.end;

                    if (isStartCell) {
                        previewCell.rowSpan = merge.end.row - merge.start.row + 1;
                        previewCell.colSpan = merge.end.col - merge.start.col + 1;
                    }
                }

                rowCells.push(previewCell);
            }

            rows.push(rowCells);
        });

        sheets.push({
            name: worksheet.name,
            rows,
            columnWidths,
            rowHeights,
            images,
        });
    });

    return { sheets };
}

/**
 * Parse cell address like "A1" to { row: 1, col: 1 }
 */
function parseCellAddress(cellAddr: string): { row: number; col: number } {
    const match = cellAddr.match(/^([A-Z]+)(\d+)$/);
    if (!match) return { row: 1, col: 1 };

    const colLetters = match[1];
    const row = parseInt(match[2]);

    // Convert column letters to number (A=1, B=2, ..., Z=26, AA=27, etc.)
    let col = 0;
    for (let i = 0; i < colLetters.length; i++) {
        col = col * 26 + (colLetters.charCodeAt(i) - 64);
    }

    return { row, col };
}

/**
 * Get display value from cell
 */
function getCellDisplayValue(cell: ExcelJS.Cell): any {
    if (cell.type === ExcelJS.ValueType.Merge) {
        return '';
    }

    const value = cell.value;

    if (value === null || value === undefined) {
        return '';
    }

    // Handle formula results
    if (cell.type === ExcelJS.ValueType.Formula && (cell as any).result !== undefined) {
        return (cell as any).result;
    }

    // Handle date values
    if (value instanceof Date) {
        return value.toLocaleDateString();
    }

    // Handle rich text
    if (typeof value === 'object' && (value as any).richText) {
        return (value as any).richText.map((rt: any) => rt.text).join('');
    }

    // Handle hyperlinks
    if (typeof value === 'object' && (value as any).text) {
        return (value as any).text;
    }

    return value;
}

/**
 * Extract cell styling information
 */
function extractCellStyle(cell: ExcelJS.Cell): CellStyle {
    const style: CellStyle = {};

    if (cell.font) {
        style.font = {
            bold: cell.font.bold,
            italic: cell.font.italic,
            size: cell.font.size,
            color: cell.font.color ? argbToHex((cell.font.color as any).argb) : undefined,
        };
    }

    if (cell.fill && cell.fill.type === 'pattern' && (cell.fill as any).fgColor) {
        style.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: argbToHex((cell.fill as any).fgColor.argb),
        };
    }

    if (cell.border) {
        style.border = {
            top: cell.border.top ? { style: cell.border.top.style || 'thin' } : undefined,
            bottom: cell.border.bottom ? { style: cell.border.bottom.style || 'thin' } : undefined,
            left: cell.border.left ? { style: cell.border.left.style || 'thin' } : undefined,
            right: cell.border.right ? { style: cell.border.right.style || 'thin' } : undefined,
        };
    }

    if (cell.alignment) {
        style.alignment = {
            horizontal: cell.alignment.horizontal as any,
            vertical: cell.alignment.vertical as any,
            wrapText: cell.alignment.wrapText,
        };
    }

    if (cell.numFmt) {
        style.numFmt = cell.numFmt;
    }

    return style;
}

/**
 * Convert ARGB color to hex
 */
function argbToHex(argb: string | undefined): string {
    if (!argb) return '#000000';

    // ARGB format: AARRGGBB
    if (argb.length === 8) {
        // Skip alpha channel, take RGB
        return '#' + argb.substring(2);
    }

    // Already hex
    if (argb.startsWith('#')) {
        return argb;
    }

    return '#' + argb;
}

/**
 * Convert buffer to base64 data URL
 */
function bufferToBase64(buffer: ArrayBuffer, extension: string): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const mimeType = extension === 'png' ? 'image/png' : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 'image/png';
    return `data:${mimeType};base64,${base64}`;
}

/**
 * Format cell value according to number format
 */
export function formatCellValue(value: any, numFmt?: string): string {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    // If no number format, return as is
    if (!numFmt) {
        return String(value);
    }

    // Handle common number formats
    if (typeof value === 'number') {
        // Currency format
        if (numFmt.includes('₱') || numFmt.includes('$')) {
            const symbol = numFmt.includes('₱') ? '₱' : '$';
            return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        // Percentage
        if (numFmt.includes('%')) {
            return `${value.toFixed(2)}%`;
        }

        // Number with decimals
        if (numFmt.includes('.00') || numFmt.includes(',##0.00')) {
            return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        // Integer
        if (numFmt.includes('#,##0')) {
            return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        }
    }

    return String(value);
}
