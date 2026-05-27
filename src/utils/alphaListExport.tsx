import { saveAs } from 'file-saver';
import type { BookletBatch } from '@/types/lottery';
import { buildAlphaListWorkbook, getWinnerNamesList } from './excelExport';
import { getManagerWinnerNames } from "@/lib/database";

export async function exportAlphaList(batch: BookletBatch) {
    const winnerNames = await getWinnerNamesList();
    
    const userId = localStorage.getItem('user_id');
    const isSpecialRegion = ['1', '3', '4', '7'].includes(userId || '');
    
    let defaultNamesToUse = await getManagerWinnerNames();
    if (!defaultNamesToUse || defaultNamesToUse.length === 0) {
        defaultNamesToUse = ["Winner"];
    }
    
    const workbook = buildAlphaListWorkbook(batch, winnerNames, defaultNamesToUse, isSpecialRegion);
    const buffer = await workbook.xlsx.writeBuffer();
    const data = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });

    saveAs(data, `AlphaList_${(batch.name || batch.id || 'Batch').replace(/[<>:"/\\|?*]/g, '-')}.xlsx`);
}
