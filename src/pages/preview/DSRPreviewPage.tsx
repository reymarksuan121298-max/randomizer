import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import type { BookletBatch } from "@/types/lottery";
import { prepareDSRWorkbook } from "@/utils/dsrExport";
import { toast } from "sonner";
import { saveAs } from "file-saver";

export const DSRPreviewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [batchData, setBatchData] = useState<BookletBatch | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(`batch_data_${id}`);
        if (saved) {
            setBatchData(JSON.parse(saved));
        }
    }, [id]);

    const handleDownload = async () => {
        if (!batchData) return;
        setIsExporting(true);
        try {
            const workbook = await prepareDSRWorkbook(batchData, {}, { name: "ADS" });
            const buffer = await workbook.xlsx.writeBuffer();
            const data = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            saveAs(data, `DSR_${batchData.name}.xlsx`);
            toast.success("DSR Exported");
        } catch (error) {
            toast.error("Export failed");
        } finally {
            setIsExporting(false);
        }
    };

    if (!batchData) return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2" /> Loading...</div>;

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-3xl font-bold">DSR Preview: {batchData.name}</h1>
                </div>
                <Button onClick={handleDownload} disabled={isExporting}>
                    <Download className="h-4 w-4 mr-2" /> Download DSR Excel
                </Button>
            </div>

            <Card className="min-h-[600px] overflow-auto">
                <CardContent className="p-8">
                    <div className="max-w-4xl mx-auto border p-12 shadow-inner bg-white text-black font-serif">
                        <h2 className="text-2xl font-bold text-center border-b-2 pb-4 mb-8">DAILY SALES REPORT</h2>
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div><strong>Batch:</strong> {batchData.name}</div>
                            <div className="text-right"><strong>Date:</strong> {new Date(batchData.date).toLocaleDateString()}</div>
                        </div>

                        <table className="w-full border-collapse border border-black">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-black p-2">Booklet #</th>
                                    <th className="border border-black p-2">Total Sales</th>
                                    <th className="border border-black p-2">Total Payout</th>
                                    <th className="border border-black p-2">Net Sales</th>
                                </tr>
                            </thead>
                            <tbody>
                                {batchData.booklets.map((b, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-black p-2 text-center">{idx + 1}</td>
                                        <td className="border border-black p-2 text-right">₱{b.revenue.toLocaleString()}</td>
                                        <td className="border border-black p-2 text-right">₱{(b.payout || 0).toLocaleString()}</td>
                                        <td className="border border-black p-2 text-right">₱{(b.revenue - (b.payout || 0)).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            tfoot: {
                                <tr className="font-bold bg-gray-200">
                                    <td className="border border-black p-2 text-center">TOTALS</td>
                                    <td className="border border-black p-2 text-right">₱{batchData.grandTotalBets.toLocaleString()}</td>
                                    <td className="border border-black p-2 text-right">₱{(batchData.totalPayout || 0).toLocaleString()}</td>
                                    <td className="border border-black p-2 text-right">₱{(batchData.grandTotalBets - (batchData.totalPayout || 0)).toLocaleString()}</td>
                                </tr>
                            }
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
