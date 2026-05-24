import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Building2, Search, Trash2, Edit } from "lucide-react";

interface Company {
    id: string;
    name: string;
    code: string;
    address: string;
    contact: string;
}

const CompaniesPage = () => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const saved = localStorage.getItem('companies');
        if (saved) {
            setCompanies(JSON.parse(saved));
        } else {
            // Default demo company
            const defaultComp = [{
                id: '1',
                name: 'Alpha Digital Solutions',
                code: 'ADS',
                address: 'Manila, Philippines',
                contact: 'admin@ads.ph'
            }];
            setCompanies(defaultComp);
            localStorage.setItem('companies', JSON.stringify(defaultComp));
        }
    }, []);

    const filtered = companies.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-primary">Companies</h1>
                    <p className="text-muted-foreground">Manage your lottery operating companies</p>
                </div>
                <Button className="gap-2">
                    <Plus className="h-5 w-5" /> Add Company
                </Button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                    placeholder="Search companies..."
                    className="pl-10 max-w-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((company) => (
                    <Card key={company.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Building2 className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle className="text-xl">{company.name}</CardTitle>
                            </div>
                            <span className="text-xs font-bold bg-muted px-2 py-1 rounded">{company.code}</span>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                                <p><strong>Address:</strong> {company.address}</p>
                                <p><strong>Contact:</strong> {company.contact}</p>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button variant="ghost" size="sm" className="gap-1">
                                    <Edit className="h-4 w-4" /> Edit
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive gap-1">
                                    <Trash2 className="h-4 w-4" /> Delete
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default CompaniesPage;
