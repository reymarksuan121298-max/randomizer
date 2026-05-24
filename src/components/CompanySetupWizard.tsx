import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Check, ChevronRight, ChevronLeft, Shield } from "lucide-react";
import { toast } from "sonner";

export const CompanySetupWizard = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        address: "",
        contact: ""
    });

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const handleFinish = () => {
        toast.success("Company setup completed!");
    };

    return (
        <Card className="max-w-xl mx-auto">
            <CardHeader>
                <div className="flex justify-between items-center mb-4">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${step >= s ? 'bg-primary border-primary text-white' : 'border-muted text-muted-foreground'
                                }`}>
                                {step > s ? <Check className="h-4 w-4" /> : s}
                            </div>
                            {s < 3 && <div className={`h-1 w-10 mx-2 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
                        </div>
                    ))}
                </div>
                <CardTitle>
                    {step === 1 && "Basic Information"}
                    {step === 2 && "Company Identity"}
                    {step === 3 && "System Preferences"}
                </CardTitle>
            </CardHeader>
            <CardContent className="min-h-[200px]">
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Company Name</Label>
                            <Input placeholder="Enter legal name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Operational Address</Label>
                            <Input placeholder="City, Province" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                        </div>
                    </div>
                )}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>System Code (Short)</Label>
                            <Input placeholder="e.g. ADS" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Contact Person / Email</Label>
                            <Input placeholder="admin@gmail.com" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
                        </div>
                    </div>
                )}
                {step === 3 && (
                    <div className="py-4 text-center space-y-4">
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 flex flex-col items-center">
                            <Shield className="h-10 w-10 text-primary mb-2" />
                            <p className="text-sm">Default security and payout constraints will be applied to this company profile. You can change these later in settings.</p>
                        </div>
                        <p className="text-xs text-muted-foreground italic">Review your details before finishing the wizard.</p>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
                <Button variant="outline" onClick={prevStep} disabled={step === 1}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                {step < 3 ? (
                    <Button onClick={nextStep} disabled={!formData.name && step === 1}>
                        Next Step <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button onClick={handleFinish}>Finish Setup</Button>
                )}
            </CardFooter>
        </Card>
    );
};
