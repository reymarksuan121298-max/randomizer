import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Save, Settings, X, AlertTriangle } from "lucide-react";
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
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getCompanySettings, updateCompanySettings } from "@/lib/database";

export const CompanySettingsPage = () => {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [company, setCompany] = useState<{
        name: string;
        province: string;
        city: string;
        code: string;
        status: string;
        prizeFundPercentage: string;
        agentCommissionPercentage: string;
        reportFrequency: string;
        municipalities: string[];
        logos: Record<string, any>;
        reportDetails: {
            bookkeeper: { name: string; title: string; signature: string | null };
            manager: { name: string; title: string; signature: string | null };
        };
        winnerNames: string;
    }>({
        name: "",
        province: "",
        city: "",
        code: "",
        status: "",
        prizeFundPercentage: "",
        agentCommissionPercentage: "",
        reportFrequency: "daily",
        municipalities: [],
        logos: {},
        reportDetails: {
            bookkeeper: { name: "", title: "", signature: null },
            manager: { name: "", title: "", signature: null }
        },
        winnerNames: ""
    });
    
    const [newMunicipality, setNewMunicipality] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
            toast.error("Please upload a PNG or JPG file only.");
            e.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                if (file.type === 'image/png') {
                    callback(reader.result);
                } else {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, 0, 0);
                            const pngDataUrl = canvas.toDataURL('image/png');
                            callback(pngDataUrl);
                        } else {
                            callback(reader.result as string);
                        }
                    };
                    img.onerror = () => {
                        toast.error("Failed to process the uploaded image.");
                    };
                    img.src = reader.result;
                }
            }
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        const loadSettings = async () => {
            if (!profile?.company?.id) return;
            try {
                const settings = await getCompanySettings(Number(profile.company.id));
                if (settings) {
                    setCompany(settings);
                }
            } catch (error) {
                console.error("Failed to load company settings:", error);
                toast.error("Failed to load company settings");
            }
        };

        loadSettings();
    }, [profile?.company?.id]);

    const handleSave = async () => {
        if (!profile?.company?.id) return;
        setIsLoading(true);
        try {
            await updateCompanySettings(Number(profile.company.id), company);
            toast.success("Company settings saved successfully");
            setIsEditorOpen(false);
        } catch (error) {
            console.error("Failed to save settings:", error);
            toast.error("Failed to save company settings");
        } finally {
            setIsLoading(false);
        }
    };

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
                        <div className="flex items-center gap-4">
                            {company.logos?.leftLogo ? (
                                <img src={company.logos.leftLogo} alt="Company Logo" className="h-16 w-16 object-contain" />
                            ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] text-slate-400 bg-slate-50">
                                    No Custom Logo
                                </div>
                            )}
                            {company.logos?.rightLogo ? (
                                <img src={company.logos.rightLogo} alt="STL Logo" className="h-16 w-16 object-contain" />
                            ) : (
                                <CompanyLogo />
                            )}
                        </div>
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

                        <TabsContent value="municipalities" className="mt-9 space-y-7">
                            <Field label="Add Municipality/City">
                                <div className="flex items-center gap-3">
                                    <Input
                                        value={newMunicipality}
                                        onChange={(e) => setNewMunicipality(e.target.value)}
                                        placeholder="Enter municipality name"
                                        className="h-12 flex-1 border-slate-200 bg-white text-lg text-slate-950"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && newMunicipality.trim()) {
                                                setCompany({ ...company, municipalities: [...company.municipalities, newMunicipality.trim()] });
                                                setNewMunicipality("");
                                            }
                                        }}
                                    />
                                    <Button
                                        className="h-12 rounded-lg bg-[#f7b500] px-6 text-lg font-medium text-slate-950 hover:bg-[#e8aa00]"
                                        onClick={() => {
                                            if (newMunicipality.trim()) {
                                                setCompany({ ...company, municipalities: [...company.municipalities, newMunicipality.trim()] });
                                                setNewMunicipality("");
                                            }
                                        }}
                                    >
                                        Add
                                    </Button>
                                </div>
                            </Field>

                            <Field label={`Municipalities (${company.municipalities.length})`}>
                                <div className="min-h-[150px] rounded-lg border border-slate-200 bg-white p-4">
                                    {company.municipalities.length === 0 ? (
                                        <div className="flex h-32 items-center justify-center text-lg text-slate-400">
                                            No municipalities added yet
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {company.municipalities.map((mun, idx) => (
                                                <div key={idx} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-2 pl-4 pr-2 text-sm font-medium text-slate-950">
                                                    {mun}
                                                    <button
                                                        onClick={() => setCompany({ ...company, municipalities: company.municipalities.filter((_, i) => i !== idx) })}
                                                        className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Field>
                        </TabsContent>

                        <TabsContent value="logos" className="mt-9 space-y-7">
                            <Field label="Left Logo (Company Logo)" helper="PNG, JPG up to 5MB (auto-converted to PNG)">
                                <Input
                                    type="file"
                                    accept="image/png, image/jpeg"
                                    onChange={(e) => handleFileChange(e, (base64) => setCompany({ ...company, logos: { ...company.logos, leftLogo: base64 } }))}
                                    className="h-12 border-slate-200 bg-white text-base file:mr-4 file:h-full file:border-0 file:bg-transparent file:text-sm file:font-medium text-slate-950"
                                />
                                {company.logos?.leftLogo && (
                                    <div className="mt-4 flex items-center justify-center rounded-lg border border-slate-200 bg-transparent p-4">
                                        <img src={company.logos.leftLogo} alt="Company Logo" className="max-h-24 object-contain" />
                                    </div>
                                )}
                            </Field>

                            <Field label="Right Logo (STL/PCSO Logo)" helper="PNG, JPG up to 5MB (auto-converted to PNG). Falls back to default STL logo if not set.">
                                <Input
                                    type="file"
                                    accept="image/png, image/jpeg"
                                    onChange={(e) => handleFileChange(e, (base64) => setCompany({ ...company, logos: { ...company.logos, rightLogo: base64 } }))}
                                    className="h-12 border-slate-200 bg-white text-base file:mr-4 file:h-full file:border-0 file:bg-transparent file:text-sm file:font-medium text-slate-950"
                                />
                                {company.logos?.rightLogo ? (
                                    <div className="mt-4 flex items-center justify-center rounded-lg border border-slate-200 bg-transparent p-4">
                                        <img src={company.logos.rightLogo} alt="Right Logo" className="max-h-24 object-contain" />
                                    </div>
                                ) : (
                                    <div className="mt-4 flex items-center justify-center rounded-lg border border-slate-200 bg-transparent p-4">
                                        <CompanyLogo />
                                    </div>
                                )}
                            </Field>
                        </TabsContent>

                        <TabsContent value="reports" className="mt-9 space-y-7">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                                <h3 className="mb-6 text-xl font-black uppercase text-slate-950">PREPARED BY (BOOKKEEPER)</h3>
                                <div className="grid grid-cols-2 gap-5">
                                    <Field label="Name">
                                        <Input
                                            value={company.reportDetails.bookkeeper.name}
                                            onChange={(e) => setCompany({ ...company, reportDetails: { ...company.reportDetails, bookkeeper: { ...company.reportDetails.bookkeeper, name: e.target.value } } })}
                                            placeholder="e.g., Juan Dela Cruz"
                                            className="h-12 border-slate-200 bg-white text-lg text-slate-950"
                                        />
                                    </Field>
                                    <Field label="Title">
                                        <Input
                                            value={company.reportDetails.bookkeeper.title}
                                            onChange={(e) => setCompany({ ...company, reportDetails: { ...company.reportDetails, bookkeeper: { ...company.reportDetails.bookkeeper, title: e.target.value } } })}
                                            placeholder="Bookkeeper"
                                            className="h-12 border-slate-200 bg-white text-lg text-slate-950"
                                        />
                                    </Field>
                                </div>
                                <div className="mt-5">
                                    <Field label="Signature" helper="PNG, JPG up to 5MB">
                                        <Input
                                            type="file"
                                            accept="image/png, image/jpeg"
                                            onChange={(e) => handleFileChange(e, (base64) => setCompany({ ...company, reportDetails: { ...company.reportDetails, bookkeeper: { ...company.reportDetails.bookkeeper, signature: base64 } } }))}
                                            className="h-12 border-slate-200 bg-white text-base file:mr-4 file:h-full file:border-0 file:bg-transparent file:text-sm file:font-medium text-slate-950"
                                        />
                                        {company.reportDetails.bookkeeper.signature && (
                                            <div className="mt-4 flex items-center rounded-lg border border-slate-200 bg-white p-4">
                                                <img src={company.reportDetails.bookkeeper.signature} alt="Bookkeeper Signature" className="max-h-16 object-contain" />
                                            </div>
                                        )}
                                    </Field>
                                </div>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                                <h3 className="mb-6 text-xl font-black uppercase text-slate-950">CERTIFIED BY (MANAGER)</h3>
                                <div className="grid grid-cols-2 gap-5">
                                    <Field label="Name">
                                        <Input
                                            value={company.reportDetails.manager.name}
                                            onChange={(e) => setCompany({ ...company, reportDetails: { ...company.reportDetails, manager: { ...company.reportDetails.manager, name: e.target.value } } })}
                                            placeholder="e.g., Maria Santos"
                                            className="h-12 border-slate-200 bg-white text-lg text-slate-950"
                                        />
                                    </Field>
                                    <Field label="Title">
                                        <Input
                                            value={company.reportDetails.manager.title}
                                            onChange={(e) => setCompany({ ...company, reportDetails: { ...company.reportDetails, manager: { ...company.reportDetails.manager, title: e.target.value } } })}
                                            placeholder="Manager"
                                            className="h-12 border-slate-200 bg-white text-lg text-slate-950"
                                        />
                                    </Field>
                                </div>
                                <div className="mt-5">
                                    <Field label="Signature" helper="PNG, JPG up to 5MB">
                                        <Input
                                            type="file"
                                            accept="image/png, image/jpeg"
                                            onChange={(e) => handleFileChange(e, (base64) => setCompany({ ...company, reportDetails: { ...company.reportDetails, manager: { ...company.reportDetails.manager, signature: base64 } } }))}
                                            className="h-12 border-slate-200 bg-white text-base file:mr-4 file:h-full file:border-0 file:bg-transparent file:text-sm file:font-medium text-slate-950"
                                        />
                                        {company.reportDetails.manager.signature && (
                                            <div className="mt-4 flex items-center rounded-lg border border-slate-200 bg-white p-4">
                                                <img src={company.reportDetails.manager.signature} alt="Manager Signature" className="max-h-16 object-contain" />
                                            </div>
                                        )}
                                    </Field>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="winners" className="mt-9 space-y-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-xl font-medium text-slate-950">Winner Names for Alpha List</h3>
                                    <p className="mt-1 text-base text-slate-600">These names are randomly selected when generating Alpha List reports</p>
                                </div>
                                <div className={`rounded-full px-4 py-2 text-sm font-bold ${
                                    (company.winnerNames.split("\\n").filter(n => n.trim()).length) >= 200 
                                    ? "bg-green-100 text-green-700" 
                                    : "bg-[#fff2bf] text-[#d99a00]"
                                }`}>
                                    {company.winnerNames.split("\n").filter(n => n.trim()).length} / 200 min
                                </div>
                            </div>
                            
                            <Field label="Enter full names (one per line)">
                                <textarea
                                    value={company.winnerNames}
                                    onChange={(e) => setCompany({ ...company, winnerNames: e.target.value })}
                                    placeholder="Example format: Gonzales, John Benedict R.&#10;Reyes, Maria Theresa C.&#10;Santos, Michael Angelo D. ..."
                                    className="min-h-[400px] w-full rounded-lg border border-slate-200 bg-white p-4 font-mono text-sm leading-relaxed text-slate-950 focus:border-[#f7b500] focus:outline-none focus:ring-1 focus:ring-[#f7b500]"
                                />
                            </Field>

                            {(company.winnerNames.split("\n").filter(n => n.trim()).length) < 200 && (
                                <div className="mt-4 flex items-start gap-3 rounded-lg border border-[#f6b719] bg-[#fffbf0] p-4 text-[#b38000]">
                                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                                    <div>
                                        <div className="font-bold">{200 - (company.winnerNames.split("\n").filter(n => n.trim()).length)} more names needed to meet minimum</div>
                                        <div className="mt-1 text-sm">Add at least 200 more full names (minimum 200 required). You can add more for variety.</div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 text-sm text-slate-500">
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                    <div className="font-bold">Minimum:</div>
                                    <div>200 names required (you can add more for greater variety)</div>
                                    <div className="font-bold">Format:</div>
                                    <div>Last Name, First Name Middle Initial (e.g., "Gonzales, John Benedict R.")</div>
                                    <div className="font-bold">Usage:</div>
                                    <div>When exporting booklets, winner names are randomly selected from this list</div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-8 border-t border-slate-100 px-8 py-6">
                        <Button variant="outline" className="h-12 px-6 text-lg" onClick={() => setIsEditorOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="h-12 rounded-lg bg-[#f7b500] px-8 text-lg font-medium text-slate-950 hover:bg-[#e8aa00]"
                            onClick={handleSave}
                            disabled={isLoading}
                        >
                            <Save className="h-5 w-5" />
                            {isLoading ? "Saving..." : "Save Changes"}
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
