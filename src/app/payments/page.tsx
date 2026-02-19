
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
import { PlusCircle, User, Warehouse, DollarSign, FileText } from 'lucide-react';
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
import { PaymentTenantSearch } from '@/components/PaymentTenantSearch';
import { InvoicePaymentSearch } from '@/components/InvoicePaymentSearch';

export default function PaymentsPage() {
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
            <h2 className="text-3xl font-bold tracking-tight">Payments</h2>
            <p className="text-muted-foreground">
              Manage your payments for each tenant.
            </p>
          </div>
          <div className="flex items-center gap-2">
          </div>
        </div>

        <div className="border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
          </p>
        </div>
        <div className="mt-6">
          {/* Search + Pagination */}
          <PaymentTenantSearch />
        </div>
        <div className="mt-6">
          <p className="text-muted-foreground p-SpcaeBelow">
              Or search payments by invoice number below:
          </p>
          <InvoicePaymentSearch />
        </div>
      </div>

      
    </>
  );
}
