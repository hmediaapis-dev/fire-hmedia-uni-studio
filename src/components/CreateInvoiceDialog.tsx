import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { getInvoices } from '@/services/invoices';
import { getTenants } from '@/services/tenants';
import type { Invoice, Tenant } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// Types
type TenantOption = {
  id: string;
  name: string;
};

type NewInvoiceForm = {
  tenantId: string;
  unitId: string;
  monthRange: string;
  amount: string;
  dueDate: string;
  notes: string;
};

type CreateInvoiceDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  refetchInvoices: () => void;
  onClose: () => void;
};

// Component
export function CreateInvoiceDialog({ isOpen, onOpenChange, refetchInvoices, onClose }: CreateInvoiceDialogProps) {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newInvoice, setNewInvoice] = useState<NewInvoiceForm>({
    tenantId: '',
    unitId: '',
    monthRange: '',
    amount: '',
    dueDate: '',
    notes: '',
  });

  //console.log('CreateInvoiceDialog render - isOpen:', isOpen);

  // Fetch tenants when dialog opens
  useEffect(() => {
    //console.log('Dialog opened:', isOpen, 'Tenants length:', tenants.length);
    if (isOpen && tenants.length === 0) {
      //console.log('Fetching tenants...');
      fetchTenants();
    }
  }, [isOpen, tenants.length]);

  const fetchTenants = async () => {
    setIsLoadingTenants(true);
    try {
      const tenantsList = await getTenants();
      console.log('Fetched tenants:', tenantsList); // Debug log
      setTenants(tenantsList.map(tenant => ({
        id: tenant.id,
        name: tenant.name,
      })));
    } catch (error) {
      console.error('Error fetching tenants:', error);
      alert('Failed to load tenants. Please try again.');
    } finally {
      setIsLoadingTenants(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setNewInvoice(prev => ({
      ...prev,
      [id.replace('create-', '')]: value,
    }));
  };

  const handleTenantSelect = (value: string) => {
    setNewInvoice(prev => ({
      ...prev,
      tenantId: value,
    }));
  };

  const resetForm = () => {
    setNewInvoice({
      tenantId: '',
      unitId: '',
      monthRange: '',
      amount: '',
      dueDate: '',
      notes: '',
    });
  };

  const handleCreateInvoice = async () => {
    // Validation
    if (!newInvoice.tenantId || !newInvoice.monthRange || 
        !newInvoice.amount || !newInvoice.dueDate) {
      alert('Please fill in all required fields.');
      return;
    }

    const amount = parseFloat(newInvoice.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const createInvoice = httpsCallable(functions, 'createInvoice');
      const result = await createInvoice({
        tenantId: newInvoice.tenantId,
        unitId: newInvoice.unitId || undefined,
        monthRange: newInvoice.monthRange,
        amount: amount,
        dueDate: newInvoice.dueDate,
        notes: newInvoice.notes,
      });

      const data = result.data as { id: string; invoiceNumber: number; success: boolean };
      console.log('Invoice created:', data);
      
      // Get tenant name for toast
      const selectedTenant = tenants.find(t => t.id === newInvoice.tenantId);
      const tenantName = selectedTenant?.name || 'Unknown Tenant';
      
      // Success! Close dialog and reset form
      // setIsCreateDialogOpen(false);
      onOpenChange(false);
      resetForm();
      
      // Show success toast
      toast({
        title: "Invoice Created",
        description: `1 invoice created for ${tenantName}`,
      });
      
      // Optional: Refresh invoice list
      refetchInvoices();
      onClose();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      alert(error.message || 'Failed to create invoice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose(); // Call the parent's function
    // Any other close logic
    onOpenChange(false);
  };

  return (
    <>
      {/* Create Invoice Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new invoice for a tenant.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Tenant Selection */}
            <div className="grid gap-2">
              <Label htmlFor="create-tenant">
                Tenant <span className="text-red-500">*</span>
              </Label>
              <Select
                key={tenants.length} // Force re-render when tenants load
                value={newInvoice.tenantId}
                onValueChange={handleTenantSelect}
                disabled={isLoadingTenants}
              >
                <SelectTrigger id="create-tenant">
                  <SelectValue placeholder={isLoadingTenants ? "Loading tenants..." : "Select a tenant"} />
                </SelectTrigger>
                <SelectContent>
                  {tenants.length === 0 ? (
                    <SelectItem value="no-tenants" disabled>No tenants available</SelectItem>
                  ) : (
                    tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Unit ID (Optional) */}
            <div className="grid gap-2">
              <Label htmlFor="create-unitId">Unit ID (Optional)</Label>
              <Input
                id="create-unitId"
                value={newInvoice.unitId}
                onChange={handleInputChange}
                placeholder="e.g., Unit 101"
              />
            </div>

            {/* Month Range */}
            <div className="grid gap-2">
              <Label htmlFor="create-monthRange">
                Month Range <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-monthRange"
                value={newInvoice.monthRange}
                onChange={handleInputChange}
                placeholder="e.g., January 2025"
              />
            </div>

            {/* Amount */}
            <div className="grid gap-2">
              <Label htmlFor="create-amount">
                Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-amount"
                type="number"
                step="0.01"
                min="0"
                value={newInvoice.amount}
                onChange={handleInputChange}
                placeholder="0.00"
              />
            </div>

            {/* Due Date */}
            <div className="grid gap-2">
              <Label htmlFor="create-dueDate">
                Due Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-dueDate"
                type="date"
                value={newInvoice.dueDate}
                onChange={handleInputChange}
              />
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="create-notes">Notes</Label>
              <Textarea
                id="create-notes"
                value={newInvoice.notes}
                onChange={handleInputChange}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateInvoice}
              disabled={isSubmitting || isLoadingTenants}
            >
              {isSubmitting ? 'Creating...' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}