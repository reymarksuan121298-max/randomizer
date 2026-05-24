import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const CompanySettingsPage = () => {
    const navigate = useNavigate();
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [company, setCompany] = useState({
        name: "",
        province: "",
        city: "",
        code: "",
        status: "",
        prizeFundPercentage: "",
        agentCommissionPercentage: "",
        reportFrequency: "daily",
    });

    const reportFrequencyLabel = company.reportFrequency === "daily" ? "Daily" : "Monthly";

    return (
        <div className="min-h-screen bg-[#f6f7f9] text-slate-900">
            <header className="relative border-b border-slate-200 bg-[#f8f9fb] px-0 pb-9 pt-2">
                <Button
                    variant="outline"
                    className="absolute left-0 top-0 h-12 rounded-l-none rounded-r-lg border-slate-200 bg-white px-5 text-sm font-black uppercase text-slate-950 shadow-sm"
                    onClick={() => navigate("/")}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
                <div className="mx-auto max-w-5xl text-center">
                    <h1 className="text-4xl font-black uppercase leading-none tracking-wider text-[#f7b500]">
                        Company Settings
                    </h1>
                    <p className="mt-12 text-2xl text-slate-600">
                        Manage your company information, logos, and report configurations
                    </p>
                </div>
            </header>

            <section className="border-b border-slate-200 bg-white px-7 py-8 shadow-sm">
                <div className="mb-8 flex items-start gap-3">
                    <Building2 className="mt-1 h-6 w-6 text-[#f7b500]" />
                    <div>
                        <h2 className="text-2xl font-black uppercase leading-tight tracking-tight text-slate-950">
                            {company.name || "No company configured"}
                        </h2>
                        <p className="mt-3 text-xl text-slate-600">
                            {[company.province, company.city].filter(Boolean).join(", ") || "Add company details to continue"}
                        </p>
                    </div>
                </div>

                <div className="grid max-w-[1250px] grid-cols-2 gap-x-28 gap-y-8">
                    <InfoBlock label="Company Code" value={company.code || "Not configured"} />
                    <InfoBlock label="Status" value={company.status || "Not configured"} valueClassName={company.status ? "text-green-600" : ""} />
                    <InfoBlock label="Report Frequency" value={reportFrequencyLabel} />
                    <div>
                        <div className="mb-2 text-lg text-slate-600">Logos</div>
                        <CompanyLogo />
                    </div>
                </div>

                <div className="mt-7 border-t border-slate-200 pt-5">
                    <Button
                        className="h-12 rounded-lg bg-[#f7b500] px-6 text-lg font-medium text-slate-950 hover:bg-[#e8aa00]"
                        onClick={() => setIsEditorOpen(true)}
                    >
                        <Settings className="h-5 w-5" />
                        Edit Company Settings
                    </Button>
                </div>
            </section>

            <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
                <DialogContent className="max-h-[92vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl sm:max-w-[1120px] [&>button]:right-7 [&>button]:top-7 [&>button]:rounded-md [&>button]:bg-white [&>button]:p-1.5 [&>button]:text-slate-500 [&>button]:shadow-sm [&>button]:ring-1 [&>button]:ring-slate-200">
                    <DialogHeader className="px-8 pt-8 text-left">
                        <DialogTitle className="text-3xl font-black uppercase tracking-tight text-[#f7b500]">
                            Manage Company Details
                        </DialogTitle>
                        <DialogDescription className="mt-5 text-xl text-slate-600">
                            Update logos, signatures, municipalities, and other company information
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="basic" className="px-8 pt-6">
                        <TabsList className="grid h-12 w-full grid-cols-5 rounded-xl bg-slate-100 p-1">
                            <TabsTrigger value="basic" className="rounded-lg text-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                Basic Info
                            </TabsTrigger>
                            <TabsTrigger value="municipalities" className="rounded-lg text-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                Municipalities
                            </TabsTrigger>
                            <TabsTrigger value="logos" className="rounded-lg text-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                Logos
                            </TabsTrigger>
                            <TabsTrigger value="reports" className="rounded-lg text-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                Report Details
                            </TabsTrigger>
                            <TabsTrigger value="winners" className="rounded-lg text-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                Winner Names
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="mt-9 space-y-7">
                            <Field label="Company Name">
                                <Input
                                    value={company.name}
                                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                                    className="h-12 border-slate-200 bg-white text-lg text-slate-950"
                                />
                            </Field>

                            <div className="grid grid-cols-2 gap-5">
                                <Field label="Province">
                                    <Input
                                        value={company.province}
                                        onChange={(e) => setCompany({ ...company, province: e.target.value })}
                                        className="h-12 border-slate-200 bg-white text-lg text-slate-950"
                                    />
                                </Field>
                                <Field label="City">
                                    <Input
                                        value={company.city}
                                        onChange={(e) => setCompany({ ...company, city: e.target.value })}
                                        className="h-12 border-slate-200 bg-white text-lg text-slate-950"
                                    />
                                </Field>
                            </div>

                            <div className="border-t border-slate-200 pt-7">
                                <div className="grid grid-cols-2 gap-5">
                                    <Field label="Prize Fund Percentage">
                                        <Input
                                            value={company.prizeFundPercentage}
                                            onChange={(e) => setCompany({ ...company, prizeFundPercentage: e.target.value })}
                                            className="h-12 border-slate-200 bg-white text-lg text-slate-950"
                                        />
                                    </Field>
                                    <Field label="Agent Commission Percentage">
                                        <Input
                                            value={company.agentCommissionPercentage}
                                            onChange={(e) => setCompany({ ...company, agentCommissionPercentage: e.target.value })}
                                            className="h-12 border-slate-200 bg-white text-lg text-slate-950"
                                        />
                                    </Field>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-7">
                                <Field label="DSR/SOD Report Frequency" helper="DSR/SOD reports are generated daily for each batch">
                                    <Select
                                        value={company.reportFrequency}
                                        onValueChange={(value) => setCompany({ ...company, reportFrequency: value })}
                                    >
                                        <SelectTrigger className="h-12 border-slate-200 bg-white text-lg text-slate-950">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Daily Reports</SelectItem>
                                            <SelectItem value="monthly">Monthly Reports</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>
                        </TabsContent>

                        {["municipalities", "logos", "reports", "winners"].map((tab) => (
                            <TabsContent key={tab} value={tab} className="mt-9 rounded-lg border border-slate-200 bg-slate-50 p-8 text-slate-600">
                                Configure this section as your workflow expands.
                            </TabsContent>
                        ))}
                    </Tabs>

                    <DialogFooter className="mt-8 border-t border-slate-100 px-8 py-6">
                        <Button variant="outline" className="h-12 px-6 text-lg" onClick={() => setIsEditorOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="h-12 rounded-lg bg-[#f7b500] px-8 text-lg font-medium text-slate-950 hover:bg-[#e8aa00]"
                            onClick={() => setIsEditorOpen(false)}
                        >
                            <Save className="h-5 w-5" />
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const InfoBlock = ({ label, value, valueClassName = "" }: { label: string; value: string; valueClassName?: string }) => (
    <div>
        <div className="mb-1 text-lg text-slate-600">{label}</div>
        <div className={`text-2xl font-medium text-slate-950 ${valueClassName}`}>{value}</div>
    </div>
);

const Field = ({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) => (
    <div className="space-y-3">
        <Label className="text-xl font-medium text-slate-950">{label}</Label>
        {children}
        {helper && <p className="text-base text-slate-600">{helper}</p>}
    </div>
);

const CompanyLogo = () => (
    <div className="relative h-16 w-16">
        <div className="absolute left-1 top-0 h-12 w-10 rounded-sm border-l-[7px] border-t-[7px] border-[#1d4ed8]" />
        <div className="absolute bottom-4 left-4 h-3 w-10 bg-[#f7b500]" />
        <div className="absolute bottom-0 right-0 h-10 w-9 border-b-[7px] border-r-[7px] border-[#dc2626]" />
    </div>
);

export default CompanySettingsPage;
