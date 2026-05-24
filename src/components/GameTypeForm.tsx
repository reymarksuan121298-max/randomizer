import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { GameType } from "@/types/lottery";

export const GameTypeForm = () => {
    const [name, setName] = useState("");
    const [multiplier, setMultiplier] = useState(80);
    const [digits, setDigits] = useState(3);
    const [format, setFormat] = useState<GameType['gameFormat']>('standard');

    const handleAdd = () => {
        if (!name) return toast.error("Please enter a game name");
        toast.success(`Game type "${name}" created!`);
        setName("");
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Register New Game Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Game Name</Label>
                    <Input placeholder="e.g. Swertres, STL Pares" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Prize Multiplier (x)</Label>
                        <Input type="number" value={multiplier} onChange={(e) => setMultiplier(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Digits / Range</Label>
                        <Input type="number" value={digits} onChange={(e) => setDigits(parseInt(e.target.value) || 0)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Game Format</Label>
                    <Select value={format} onValueChange={(val: any) => setFormat(val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="standard">Standard (Single Number)</SelectItem>
                            <SelectItem value="3D">3D (National)</SelectItem>
                            <SelectItem value="L3D">L3D (Local)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button className="w-full mt-4" onClick={handleAdd}>Save Game Type</Button>
            </CardContent>
        </Card>
    );
};
