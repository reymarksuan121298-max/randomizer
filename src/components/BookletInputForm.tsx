import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export const BookletInputForm = () => {
    const [config, setConfig] = useState({
        revenue: 5000,
        payout: 1750,
        company: "",
        drawTime: "11:00 AM"
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Saving booklet config:", config);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Booklet Configuration</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Target Revenue (₱)</Label>
                            <Input
                                type="number"
                                value={config.revenue}
                                onChange={(e) => setConfig({ ...config, revenue: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Target Payout (₱)</Label>
                            <Input
                                type="number"
                                value={config.payout}
                                onChange={(e) => setConfig({ ...config, payout: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Draw Time</Label>
                        <Select value={config.drawTime} onValueChange={(val) => setConfig({ ...config, drawTime: val })}>
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

                    <Button type="submit" className="w-full">Update Parameters</Button>
                </form>
            </CardContent>
        </Card>
    );
};
