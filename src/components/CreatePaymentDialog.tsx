import { useState, useEffect } from 'react';

import { getTenants } from '@/services/tenants';
import { db } from '@/lib/firebase'; 
import { recordPayment } from '@/services/payments';

import { collection, query, where, getDocs } from 'firebase/firestore';
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

type InvoiceOption = {
  id: string;
  invoiceNumber: number;
  monthRange: string;
  amount: number;
  amountPaid?: number;
  status: string;
};

type NewPaymentForm = {
  tenantId: string;
  amount: string;
  paymentMethod: 'Cash' | 'Check' | 'Credit Card' | 'Other' | '';
  invoiceId: string;
  notes: string;
};

type CreatePaymentDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreatePaymentDialog({ isOpen, onOpenChange }: CreatePaymentDialogProps) {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPayment, setNewPayment] = useState<NewPaymentForm>({
    tenantId: '',
    amount: '',
    paymentMethod: '',
    invoiceId: '',
    notes: '',
  });

  // Fetch tenants when dialog opens
  useEffect(() => {
    if (isOpen && tenants.length === 0) {
      fetchTenants();
    }
  }, [isOpen, tenants.length]);

  // Fetch invoices when tenant is selected
  useEffect(() => {
    if (newPayment.tenantId) {
      fetchInvoicesForTenant(newPayment.tenantId);
    } else {
      setInvoices([]);
      setNewPayment(prev => ({ ...prev, invoiceId: '' }));
    }
  }, [newPayment.tenantId]);

  const fetchTenants = async () => {
    setIsLoadingTenants(true);
    try {
      const tenantsList = await getTenants();
      setTenants(tenantsList.map(tenant => ({
        id: tenant.id,
        name: tenant.name,
      })));
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: "Error",
        description: "Failed to load tenants. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTenants(false);
    }
  };

  const fetchInvoicesForTenant = async (tenantId: string) => {
    setIsLoadingInvoices(true);
    try {
      const invoicesRef = collection(db, 'invoices');
      const q = query(
        invoicesRef,
        where('tenantId', '==', tenantId),
        where('status', 'in', ['unpaid', 'partially-paid'])
      );
      const snapshot = await getDocs(q);
      
      const invoicesList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          invoiceNumber: data.invoiceNumber,
          monthRange: data.monthRange,
          amount: data.amount,
          amountPaid: data.amountPaid || 0,
          status: data.status,
        };
      });

      // Sort by invoice number descending (newest first)
      invoicesList.sort((a, b) => b.invoiceNumber - a.invoiceNumber);
      
      setInvoices(invoicesList);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Error",
        description: "Failed to load invoices. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setNewPayment(prev => ({
      ...prev,
      [id.replace('create-', '')]: value,
    }));
  };

  const handleTenantSelect = (value: string) => {
    setNewPayment(prev => ({
      ...prev,
      tenantId: value,
      invoiceId: '', // Reset invoice selection when tenant changes
    }));
  };

  const handleInvoiceSelect = (value: string) => {
    setNewPayment(prev => ({
      ...prev,
      invoiceId: value,
    }));
  };

  const handlePaymentMethodSelect = (value: string) => {
    setNewPayment(prev => ({
      ...prev,
      paymentMethod: value as 'Cash' | 'Check' | 'Credit Card' | 'Other',
    }));
  };

  const resetForm = () => {
    setNewPayment({
      tenantId: '',
      amount: '',
      paymentMethod: '',
      invoiceId: '',
      notes: '',
    });
    setInvoices([]);
  };

  const handleCreatePayment = async () => {
    // Validation
    if (!newPayment.tenantId || !newPayment.amount || 
        !newPayment.paymentMethod || !newPayment.invoiceId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(newPayment.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentData = {
        tenantId: newPayment.tenantId,
        amount: amount,
        paymentMethod: newPayment.paymentMethod,
        invoiceIds: [newPayment.invoiceId], // Single invoice in array
        notes: newPayment.notes || undefined,
        status: 'complete' as const,
      };

      const result = await recordPayment(paymentData);
      
      if (result.success) {
        // Get tenant name for toast
        const selectedTenant = tenants.find(t => t.id === newPayment.tenantId);
        const tenantName = selectedTenant?.name || 'Unknown Tenant';
        
        // Success! Close dialog and reset form
        onOpenChange(false);
        resetForm();
        
        // Show success toast
        toast({
          title: "Payment Recorded",
          description: `Payment of $${amount.toFixed(2)} recorded for ${tenantName}`,
        });
        
        // Optional: Refresh payment list
        // refetchPayments();
      } else {
        throw new Error(result.message || 'Failed to record payment');
      }
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to record payment. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInvoiceDisplayText = (invoice: InvoiceOption) => {
    const remaining = invoice.amount - (invoice.amountPaid || 0);
    return `#${invoice.invoiceNumber} - ${invoice.monthRange} ($${remaining.toFixed(2)} remaining)`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record New Payment</DialogTitle>
          <DialogDescription>
            Record a payment from a tenant and apply it to an invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Tenant Selection */}
          <div className="grid gap-2">
            <Label htmlFor="create-tenant">
              Tenant <span className="text-red-500">*</span>
            </Label>
            <Select
              key={tenants.length}
              value={newPayment.tenantId}
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

          {/* Invoice Selection */}
          <div className="grid gap-2">
            <Label htmlFor="create-invoice">
              Invoice <span className="text-red-500">*</span>
            </Label>
            <Select
              key={`${newPayment.tenantId}-${invoices.length}`}
              value={newPayment.invoiceId}
              onValueChange={handleInvoiceSelect}
              disabled={!newPayment.tenantId || isLoadingInvoices}
            >
              <SelectTrigger id="create-invoice">
                <SelectValue placeholder={
                  !newPayment.tenantId 
                    ? "Select a tenant first" 
                    : isLoadingInvoices 
                    ? "Loading invoices..." 
                    : "Select an invoice"
                } />
              </SelectTrigger>
              <SelectContent>
                {invoices.length === 0 ? (
                  <SelectItem value="no-invoices" disabled>
                    {newPayment.tenantId ? "No unpaid invoices" : "Select a tenant first"}
                  </SelectItem>
                ) : (
                  invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {getInvoiceDisplayText(invoice)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div className="grid gap-2">
            <Label htmlFor="create-paymentMethod">
              Payment Method <span className="text-red-500">*</span>
            </Label>
            <Select
              value={newPayment.paymentMethod}
              onValueChange={handlePaymentMethodSelect}
            >
              <SelectTrigger id="create-paymentMethod">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Check">Check</SelectItem>
                <SelectItem value="Credit Card">Credit Card</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
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
              value={newPayment.amount}
              onChange={handleInputChange}
              placeholder="0.00"
            />
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="create-notes">Notes</Label>
            <Textarea
              id="create-notes"
              value={newPayment.notes}
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
            onClick={handleCreatePayment}
            disabled={isSubmitting || isLoadingTenants || isLoadingInvoices}
          >
            {isSubmitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}