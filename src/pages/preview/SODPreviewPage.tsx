import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import type { BookletBatch } from "@/types/lottery";
import { prepareSODWorkbook } from "@/utils/sodExport";
import { toast } from "sonner";
import { saveAs } from "file-saver";

export const SODPreviewPage = () => {
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
            const workbook = await prepareSODWorkbook(batchData, { name: "ADS" });
            const buffer = await workbook.xlsx.writeBuffer();
            const data = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            saveAs(data, `SOD_${batchData.name}.xlsx`);
            toast.success("SOD Exported");
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
                    <h1 className="text-3xl font-bold">SOD Preview: {batchData.name}</h1>
                </div>
                <Button onClick={handleDownload} disabled={isExporting}>
                    <Download className="h-4 w-4 mr-2" /> Download SOD Excel
                </Button>
            </div>

            <Card className="min-h-[600px] overflow-auto">
                <CardContent className="p-8">
                    <div className="max-w-4xl mx-auto border p-12 shadow-inner bg-white text-black font-mono text-sm">
                        <div className="text-center font-bold text-xl mb-4 underline">STATEMENT OF DRAW</div>
                        <div className="mb-6">
                            <div>COMPANY: ADS</div>
                            <div>DATE: {new Date(batchData.date).toLocaleDateString()}</div>
                        </div>
                        <div className="border-y-2 border-black py-2 grid grid-cols-3 font-bold mb-4">
                            <div>SHEET ID</div>
                            <div className="text-right">TOTAL BETS</div>
                            <div className="text-right">STATUS</div>
                        </div>
                        <div className="space-y-1">
                            {batchData.booklets[0]?.sheets.map(s => (
                                <div key={s.id} className="grid grid-cols-3 border-b border-dotted pb-1">
                                    <div>{s.id}</div>
                                    <div className="text-right">₱{s.tickets.reduce((sum, t) => sum + t.numberBets.reduce((sb, nb) => sb + nb.bet, 0), 0).toLocaleString()}</div>
                                    <div className="text-right">OK</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
