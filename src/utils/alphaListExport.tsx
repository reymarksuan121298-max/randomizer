import { saveAs } from 'file-saver';
import type { BookletBatch } from '@/types/lottery';
import { buildAlphaListWorkbook } from './excelExport';

export async function exportAlphaList(batch: BookletBatch) {
    const workbook = buildAlphaListWorkbook(batch);
    const buffer = await workbook.xlsx.writeBuffer();
    const data = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });

    saveAs(data, `AlphaList_${(batch.name || batch.id || 'Batch').replace(/[<>:"/\\|?*]/g, '-')}.xlsx`);
}
