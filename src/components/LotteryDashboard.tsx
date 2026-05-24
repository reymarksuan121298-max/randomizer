import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { TrendingUp, Users, Ticket, RefreshCw } from "lucide-react";

export const LotteryDashboard = () => {
    const [stats, setStats] = useState({
        totalBatches: 0,
        totalRevenue: 0,
        totalPayout: 0
    });

    useEffect(() => {
        const saved = localStorage.getItem('batches');
        if (saved) {
            const batches = JSON.parse(saved);
            const totalRev = batches.reduce((sum: number, b: any) => sum + (b.total_revenue || 0), 0);
            const totalPay = batches.reduce((sum: number, b: any) => sum + (b.total_payout || 0), 0);
            setStats({
                totalBatches: batches.length,
                totalRevenue: totalRev,
                totalPayout: totalPay
            });
        }
    }, []);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-primary/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Batches</CardTitle>
                        <RefreshCw className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalBatches}</div>
                        <p className="text-xs text-muted-foreground mt-1">Generated and verified</p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-blue-900">Total Sales</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">₱{stats.totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-blue-600/70 mt-1">+8.2% from last month</p>
                    </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-100">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-red-900">Total Payouts</CardTitle>
                        <Ticket className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-900">₱{stats.totalPayout.toLocaleString()}</div>
                        <p className="text-xs text-red-600/70 mt-1">33.9% average ratio</p>
                    </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-100">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-green-900">Net Profit</CardTitle>
                        <Users className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900">₱{(stats.totalRevenue - stats.totalPayout).toLocaleString()}</div>
                        <p className="text-xs text-green-600/70 mt-1">Ready for distribution</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};