import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, MapPin, TrendingUp, Users } from "lucide-react";

const DemoVisayasPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/demo')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-red-500" /> Visayas Region Dashboard
                        </h1>
                    </div>
                    <Button onClick={() => navigate('/login')}>Login to System</Button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-none shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-80">Total Revenue (MTD)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">₱4.2M</div>
                            <div className="flex items-center text-xs mt-2 text-indigo-100 italic">
                                <TrendingUp className="h-3 w-3 mr-1" /> +12% from last month
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-none shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-80">Active Outlets</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">142</div>
                            <p className="text-xs mt-2 text-emerald-100">Cebu, Iloilo, Bacolod sectors</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-500 to-amber-700 text-white border-none shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-80">Winning Ratio</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">33.9%</div>
                            <p className="text-xs mt-2 text-amber-100">Within statutory limit (34%)</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sector Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[
                                    { name: "Cebu Metro", rev: "₱1,250,000", color: "bg-blue-500" },
                                    { name: "Iloilo City", rev: "₱980,000", color: "bg-emerald-500" },
                                    { name: "Bacolod North", rev: "₱850,000", color: "bg-orange-500" },
                                    { name: "Dumaguete", rev: "₱620,000", color: "bg-purple-500" },
                                ].map(sector => (
                                    <div key={sector.name} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{sector.name}</span>
                                            <span className="text-slate-500">{sector.rev}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div className={`${sector.color} h-full`} style={{ width: '70%' }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="flex gap-4 items-start">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                            <Users className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <div className="border-b pb-4 w-full last:border-0">
                                            <div className="flex justify-between">
                                                <h4 className="text-sm font-bold">Batch #VIS-2026-00{i}</h4>
                                                <span className="text-[10px] text-slate-400">2h ago</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">Generated by Officer Pedro Gil for 11:00 AM Draw.</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default DemoVisayasPage;
