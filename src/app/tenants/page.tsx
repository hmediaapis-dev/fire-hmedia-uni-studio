
'use client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle, User, Warehouse, DollarSign, FileText, Home, Search, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Tenant } from '@/types';
import { Separator } from '@/components/ui/separator';
import { addTenant } from '@/services/tenants';
import { useToast } from "@/hooks/use-toast";
import { TenantSearchList } from '@/components/TenantSearchList';

export default function TenantsPage() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);  /*used to add a tenant setTenant*/
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    nameLower: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      //removed large set gets
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({
        title: "Error",
        description: "Failed to load data from the database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  

  const handleNewTenantInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setNewTenant((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddTenant = async () => {
    if (!newTenant.name || !newTenant.email) {
      toast({
        title: "Validation Error",
        description: "Name and Email are required.",
        variant: "destructive",
      });
      return;
    }
    try {
      const newTenantData: Omit<Tenant, 'id'> = {
        ...newTenant,
        units: [],
        rent: 0,
        balance: 0,
        joinDate: new Date(),
      };
      const tenantId = await addTenant(newTenantData);
      setTenants((prev) => [...prev, { id: tenantId, ...newTenantData }]);
      setNewTenant({ name: '', nameLower: '', email: '', phone: '', address: '', notes: '' });
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Tenant added successfully.",
      });
      await loadData();
    } catch (error) {
      console.error("Failed to add tenant:", error);
      toast({
        title: "Error",
        description: "Could not add new tenant.",
        variant: "destructive",
      });
    }
  };



  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Tenants</h2>
            <p className="text-muted-foreground">
              Manage your tenants and their information.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Tenant
                </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add New Tenant</DialogTitle>
                    <DialogDescription>
                    Enter the details for the new tenant.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                          id="name"
                          placeholder="John Doe"
                          value={newTenant.name}
                          onChange={handleNewTenantInputChange}
                      />
                    </div>
                    <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="john.doe@example.com"
                        value={newTenant.email}
                        onChange={handleNewTenantInputChange}
                    />
                    </div>
                    <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                        id="phone"
                        placeholder="555-123-4567"
                        value={newTenant.phone}
                        onChange={handleNewTenantInputChange}
                    />
                    </div>
                    <div className="grid gap-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                        id="address"
                        placeholder="123 Main St, Anytown, USA"
                        value={newTenant.address}
                        onChange={handleNewTenantInputChange}
                    />
                    </div>
                    <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                        id="notes"
                        placeholder="Initial notes about the tenant..."
                        value={newTenant.notes}
                        onChange={handleNewTenantInputChange}
                    />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddTenant}>Save Tenant</Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
          </p>
        </div>
        <div className="mt-6">
          {/* Search + Pagination */}
          <TenantSearchList />
        </div>
        {/*<div className="mb-6 flex justify-center">
          <TenantReportSelector tenants={tenants} />
        </div>*/} {/* old report selector */}
      </div>

      
    </>
  );
}
