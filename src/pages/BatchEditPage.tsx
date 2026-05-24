import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Play, ArrowLeft } from "lucide-react";
import { generateBookletBatch } from "@/utils/lotteryGenerator";
import { gameTypes } from "@/data/gameTypes";
import type { Batch } from "./BatchesPage";
import { databaseEnabled, saveGeneratedBatchToDatabase } from "@/lib/database";

const BatchEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [batch, setBatch] = useState<Batch | null>(null);
    const [config, setConfig] = useState({
        bookletCount: 1,
        targetRevenue: 50000,
        targetPayout: 15000,
        companyCode: "",
        drawTime: "11:00 AM"
    });
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('batches');
        if (saved) {
            const batches = JSON.parse(saved);
            const found = batches.find((b: Batch) => b.id === id);
            if (found) setBatch(found);
        }
    }, [id]);

    const handleGenerate = async () => {
        if (!batch) return;
        setIsGenerating(true);
        try {
            // Mock generation delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            const generatedData = generateBookletBatch(
                config.companyCode, // province/area code
                config.targetRevenue,
                config.bookletCount,
                5, // minBet
                150, // maxBet
                80, // multipleOfFivePercent
                [{ start: "1000001", end: (1000001 + (config.bookletCount * 50 * 5) - 1).toString() }],
                gameTypes,
                config.targetPayout,
                {}, // winningNumbers (empty for now, will be distributed)
                config.companyCode
            );
            generatedData.id = id;
            generatedData.name = batch.name;
            generatedData.province = batch.province;

            // Update batch in list
            const saved = localStorage.getItem('batches');
            if (saved) {
                const batches = JSON.parse(saved);
                const updatedBatches = batches.map((b: Batch) =>
                    b.id === id ? {
                        ...b,
                        status: 'generated',
                        total_revenue: generatedData.grandTotalBets,
                        total_payout: generatedData.totalPayout
                    } : b
                );
                localStorage.setItem('batches', JSON.stringify(updatedBatches));

                // Save the detailed batch data separately
                localStorage.setItem(`batch_data_${id}`, JSON.stringify(generatedData));

                const updatedBatch = updatedBatches.find((b: Batch) => b.id === id);
                if (updatedBatch && databaseEnabled()) {
                    await saveGeneratedBatchToDatabase(updatedBatch, generatedData, {
                        companyName: updatedBatch.province || updatedBatch.name,
                        companyCode: config.companyCode,
                        gameTypes,
                    });
                }
            }

            toast.success(`Batch generated successfully${databaseEnabled() ? " and saved to database" : ""}!`);
            navigate(`/batch/${id}`);
        } catch (error) {
            console.error(error);
            toast.error("Generation failed. Check console for details.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!batch) return <div className="p-8 text-center">Batch not found</div>;

    return (
        <div className="container mx-auto py-8 px-4 max-w-2xl">
            <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate('/batches')}>
                <ArrowLeft className="h-4 w-4" /> Back to Batches
            </Button>

            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl">Configure Batch: {batch.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Number of Booklets</Label>
                            <Input
                                type="number"
                                value={config.bookletCount}
                                onChange={(e) => setConfig({ ...config, bookletCount: parseInt(e.target.value) || 1 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Company Code</Label>
                            <Input
                                value={config.companyCode}
                                onChange={(e) => setConfig({ ...config, companyCode: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Target Total Revenue (₱)</Label>
                            <Input
                                type="number"
                                value={config.targetRevenue}
                                step="1000"
                                onChange={(e) => setConfig({ ...config, targetRevenue: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Target Total Payout (₱)</Label>
                            <Input
                                type="number"
                                value={config.targetPayout}
                                step="500"
                                onChange={(e) => setConfig({ ...config, targetPayout: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Draw Time</Label>
                        <Select
                            value={config.drawTime}
                            onValueChange={(val) => setConfig({ ...config, drawTime: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="11:00 AM">11:00 AM</SelectItem>
                                <SelectItem value="04:00 PM">04:00 PM</SelectItem>
                                <SelectItem value="09:00 PM">09:00 PM</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t pt-6">
                    <Button variant="outline" onClick={() => navigate('/batches')}>Cancel</Button>
                    <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        Generate Batch
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default BatchEditPage;
