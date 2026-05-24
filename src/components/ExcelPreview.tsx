import { useState } from 'react';
import type { ExcelPreviewData } from '@/utils/excelPreview';
import { formatCellValue } from '@/utils/excelPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ExcelPreviewProps {
    data: ExcelPreviewData;
}

export function ExcelPreview({ data }: ExcelPreviewProps) {
    const [activeSheet, setActiveSheet] = useState(0);

    if (!data || !data.sheets || data.sheets.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                No preview data available
            </div>
        );
    }

    return (
        <div className="w-full">
            {data.sheets.length > 1 ? (
                <Tabs value={String(activeSheet)} onValueChange={(v) => setActiveSheet(parseInt(v))}>
                    <TabsList className="mb-4">
                        {data.sheets.map((sheet, index) => (
                            <TabsTrigger key={index} value={String(index)}>
                                {sheet.name}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {data.sheets.map((sheet, index) => (
                        <TabsContent key={index} value={String(index)}>
                            <SheetPreview sheet={sheet} />
                        </TabsContent>
                    ))}
                </Tabs>
            ) : (
                <SheetPreview sheet={data.sheets[0]} />
            )}
        </div>
    );
}

interface SheetPreviewProps {
    sheet: ExcelPreviewData['sheets'][0];
}

function SheetPreview({ sheet }: SheetPreviewProps) {
    const getColumnLabel = (index: number): string => {
        let label = '';
        let num = index;
        while (num >= 0) {
            label = String.fromCharCode(65 + (num % 26)) + label;
            num = Math.floor(num / 26) - 1;
        }
        return label;
    };

    return (
        <div className="w-full flex justify-center">
            <div className="overflow-auto border rounded-lg bg-white shadow-lg max-w-full">
                <div className="relative">
                    <table className="border-collapse" style={{ tableLayout: 'fixed', margin: '0 auto' }}>
                        <colgroup>
                            <col style={{ width: '50px' }} />
                            {sheet.columnWidths.map((width, index) => (
                                <col key={index} style={{ width: `${(width || 10) * 7}px` }} />
                            ))}
                        </colgroup>

                        <thead>
                            <tr style={{ height: '25px' }}>
                                <th className="border border-gray-400 bg-gray-200 text-gray-700 font-semibold text-xs sticky top-0 left-0 z-20"></th>
                                {sheet.columnWidths.map((_, colIndex) => (
                                    <th
                                        key={colIndex}
                                        className="border border-gray-400 bg-gray-200 text-gray-700 font-semibold text-xs text-center sticky top-0 z-10"
                                    >
                                        {getColumnLabel(colIndex)}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {sheet.rows.map((row, rowIndex) => (
                                <tr key={rowIndex} style={{ height: `${sheet.rowHeights[rowIndex] || 20}px` }}>
                                    <td className="border border-gray-400 bg-gray-200 text-gray-700 font-semibold text-xs text-center sticky left-0 z-10">
                                        {rowIndex + 1}
                                    </td>

                                    {row.map((cell, colIndex) => {
                                        if (cell.isMerged && (cell.mergeStart?.row !== rowIndex + 1 || cell.mergeStart?.col !== colIndex + 1)) {
                                            return null;
                                        }

                                        const style = cell.style;
                                        return (
                                            <td
                                                key={colIndex}
                                                rowSpan={cell.rowSpan}
                                                colSpan={cell.colSpan}
                                                className="border border-gray-300 p-1 text-xs whitespace-pre-wrap overflow-hidden"
                                                style={{
                                                    textAlign: style.alignment?.horizontal || 'left',
                                                    verticalAlign: style.alignment?.vertical === 'middle' ? 'middle' : style.alignment?.vertical === 'bottom' ? 'bottom' : 'top',
                                                    fontWeight: style.font?.bold ? 'bold' : 'normal',
                                                    fontStyle: style.font?.italic ? 'italic' : 'normal',
                                                    backgroundColor: style.fill?.fgColor || 'transparent',
                                                    color: style.font?.color || 'inherit',
                                                    fontSize: style.font?.size ? `${style.font.size}px` : undefined,
                                                }}
                                            >
                                                {formatCellValue(cell.value, style.numFmt)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
