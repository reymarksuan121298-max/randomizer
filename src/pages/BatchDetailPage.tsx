import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, Eye } from "lucide-react";
import { SheetCard } from "@/components/SheetCard";
import type { BookletBatch } from "@/types/lottery";
import { exportToExcel } from "@/utils/excelExport";
import { toast } from "sonner";

export const BatchDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [batchData, setBatchData] = useState<BookletBatch | null>(null);
    const [selectedBookletIdx, setSelectedBookletIdx] = useState(0);

    useEffect(() => {
        const saved = localStorage.getItem(`batch_data_${id}`);
        if (saved) {
            setBatchData(JSON.parse(saved));
        }
    }, [id]);

    const handleExport = async () => {
        if (!batchData) return;
        try {
            await exportToExcel(batchData, batchData.booklets);
            toast.success("Excel exported successfully!");
        } catch (error) {
            toast.error("Export failed");
        }
    };

    if (!batchData) {
        return (
            <div className="container mx-auto py-20 text-center">
                <h2 className="text-2xl font-bold mb-4">Batch data not found or not yet generated</h2>
                <Button asChild>
                    <Link to={`/batch/${id}/edit`}>Go to Generation Page</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link to="/batches"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-primary">{batchData.name}</h1>
                        <p className="text-muted-foreground">Generated on {new Date(batchData.date).toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => navigate(`/batch/${id}/preview/dsr`)}>
                        <Eye className="h-4 w-4" /> DSR Preview
                    </Button>
                    <Button className="gap-2" onClick={handleExport}>
                        <Download className="h-4 w-4" /> Export Excel
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Stats Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-sm text-muted-foreground">Booklets</span>
                                <span className="font-bold">{batchData.booklets.length}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b text-blue-600">
                                <span className="text-sm">Total Revenue</span>
                                <span className="font-bold">₱{batchData.grandTotalBets.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b text-red-600">
                                <span className="text-sm">Total Payout</span>
                                <span className="font-bold">₱{(batchData.totalPayout || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm font-medium">Net Revenue</span>
                                <span className="font-bold">₱{(batchData.grandTotalBets - (batchData.totalPayout || 0)).toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Select Booklet</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                            <div className="max-h-[400px] overflow-y-auto space-y-1">
                                {batchData.booklets.map((booklet, idx) => (
                                    <button
                                        key={booklet.id}
                                        className={`w-full text-left px-4 py-3 rounded-md transition-colors text-sm font-medium ${selectedBookletIdx === idx ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted'
                                            }`}
                                        onClick={() => setSelectedBookletIdx(idx)}
                                    >
                                        Booklet #{idx + 1}
                                        <div className={`text-[10px] ${selectedBookletIdx === idx ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                            {booklet.sheets.length} sheets • ₱{booklet.revenue.toLocaleString()}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-3">
                    <Tabs defaultValue="sheets">
                        <div className="flex justify-between items-center mb-6">
                            <TabsList>
                                <TabsTrigger value="sheets">Sheets View</TabsTrigger>
                                <TabsTrigger value="winning">Winning Numbers</TabsTrigger>
                            </TabsList>
                            <div className="text-sm font-medium bg-muted px-3 py-1 rounded-full border">
                                Current: Booklet #{selectedBookletIdx + 1}
                            </div>
                        </div>

                        <TabsContent value="sheets" className="mt-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {batchData.booklets[selectedBookletIdx].sheets.map((sheet) => (
                                    <SheetCard key={sheet.id} sheet={sheet} />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="winning">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Winning Numbers for Booklet #{selectedBookletIdx + 1}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {/* Note: In a real app, winning numbers might be shared or per booklet */}
                                        <div className="border rounded p-4 text-center">
                                            <div className="text-xs text-muted-foreground uppercase font-bold mb-2">Sample Result</div>
                                            <div className="text-3xl font-mono font-bold tracking-widest text-primary">---</div>
                                            <p className="text-[10px] mt-2 text-muted-foreground italic">Numbers generated as needed</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
};
