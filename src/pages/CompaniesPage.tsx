import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Building2, Search, Trash2, Edit } from "lucide-react";
import { databaseEnabled, listCompaniesFromDatabase, type CompanyRecord } from "@/lib/database";
import { toast } from "sonner";

const CompaniesPage = () => {
    const [companies, setCompanies] = useState<CompanyRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!databaseEnabled()) {
            setCompanies([]);
            setIsLoading(false);
            return;
        }

        listCompaniesFromDatabase()
            .then(setCompanies)
            .catch((error) => {
                console.error(error);
                toast.error("Could not load companies from database.");
            })
            .finally(() => setIsLoading(false));
    }, []);

    const filtered = companies.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#f7f8fa] dark:bg-slate-950 transition-colors duration-300">
            <div className="container mx-auto py-8 px-4 text-slate-900 dark:text-slate-50">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-primary">Companies</h1>
                    <p className="text-muted-foreground dark:text-slate-400">Manage your lottery operating companies</p>
                </div>
                <Button className="gap-2">
                    <Plus className="h-5 w-5" /> Add Company
                </Button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground dark:text-slate-400 h-4 w-4" />
                <Input
                    placeholder="Search companies..."
                    className="pl-10 max-w-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading && <p className="text-sm text-muted-foreground dark:text-slate-400">Loading companies...</p>}
                {!isLoading && filtered.length === 0 && (
                    <div className="col-span-full rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground dark:border-slate-700 dark:text-slate-400">
                        No companies found.
                    </div>
                )}
                {filtered.map((company) => (
                    <Card key={company.id} className="hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Building2 className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle className="text-xl">{company.name}</CardTitle>
                            </div>
                            <span className="text-xs font-bold bg-muted px-2 py-1 rounded dark:bg-slate-800 dark:text-slate-300">{company.code}</span>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-sm text-muted-foreground dark:text-slate-400">
                                <p><strong>Address:</strong> {company.address}</p>
                                <p><strong>Contact:</strong> {company.contact}</p>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-800">
                                <Button variant="ghost" size="sm" className="gap-1 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-100">
                                    <Edit className="h-4 w-4" /> Edit
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive gap-1 dark:hover:bg-red-900/30">
                                    <Trash2 className="h-4 w-4" /> Delete
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
        </div>
    );
};

export default CompaniesPage;
