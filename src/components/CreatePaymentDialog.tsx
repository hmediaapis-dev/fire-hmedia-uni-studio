import { useState, useEffect } from 'react';

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

// Sentinel value used in the Select to represent "no invoice / general payment"
const GENERAL_PAYMENT_VALUE = '__general__';

type InvoiceOption = {
  id: string;
  invoiceNumber: number;
  monthRange: string;
  amount: number;
  amountPaid?: number;
  status: string;
};

type NewPaymentForm = {
  amount: string;
  paymentMethod: 'Cash' | 'Check' | 'Credit Card' | 'Other' | '';
  // Empty string means "general payment — no invoice"
  invoiceId: string;
  notes: string;
};

type CreatePaymentDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** The tenant this dialog is scoped to. No tenant picker needed. */
  tenantId: string;
  refetchPayments: () => void;
};

export function CreatePaymentDialog({
  isOpen,
  onOpenChange,
  tenantId,
  refetchPayments,
}: CreatePaymentDialogProps) {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPayment, setNewPayment] = useState<NewPaymentForm>({
    amount: '',
    paymentMethod: '',
    invoiceId: '',
    notes: '',
  });

  // Fetch this tenant's unpaid invoices whenever the dialog opens
  useEffect(() => {
    if (isOpen && tenantId) {
      fetchInvoicesForTenant(tenantId);
    }
  }, [isOpen, tenantId]);

  const fetchInvoicesForTenant = async (id: string) => {
    setIsLoadingInvoices(true);
    try {
      const invoicesRef = collection(db, 'invoices');
      const q = query(
        invoicesRef,
        where('tenantId', '==', id),
        where('status', 'in', ['unpaid', 'partially-paid'])
      );
      const snapshot = await getDocs(q);

      const invoicesList = snapshot.docs.map((doc) => {
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

      // Newest invoice first
      invoicesList.sort((a, b) => b.invoiceNumber - a.invoiceNumber);
      setInvoices(invoicesList);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invoices. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setNewPayment((prev) => ({
      ...prev,
      [id.replace('create-', '')]: value,
    }));
  };

  const handleInvoiceSelect = (value: string) => {
    // GENERAL_PAYMENT_VALUE means user explicitly chose "no invoice"
    setNewPayment((prev) => ({
      ...prev,
      invoiceId: value === GENERAL_PAYMENT_VALUE ? '' : value,
    }));
  };

  const handlePaymentMethodSelect = (value: string) => {
    setNewPayment((prev) => ({
      ...prev,
      paymentMethod: value as 'Cash' | 'Check' | 'Credit Card' | 'Other',
    }));
  };

  const resetForm = () => {
    setNewPayment({
      amount: '',
      paymentMethod: '',
      invoiceId: '',
      notes: '',
    });
  };

  const handleCreatePayment = async () => {
    // invoiceId is now OPTIONAL — no longer a required field
    if (!newPayment.amount || !newPayment.paymentMethod) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in the amount and payment method.',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(newPayment.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid positive amount.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentData = {
        tenantId,
        amount,
        paymentMethod: newPayment.paymentMethod as 'Cash' | 'Check' | 'Credit Card' | 'Other',
        // Only include invoiceIds if one was actually selected
        invoiceIds: newPayment.invoiceId ? [newPayment.invoiceId] : [],
        notes: newPayment.notes || undefined,
        status: 'complete' as const,
      };

      const result = await recordPayment(paymentData);

      if (result.success) {
        onOpenChange(false);
        resetForm();

        const invoiceMsg = newPayment.invoiceId
          ? `applied to invoice`
          : `applied to tenant balance`;

        toast({
          title: 'Payment Recorded',
          description: `$${amount.toFixed(2)} ${invoiceMsg}.`,
        });

        refetchPayments();
      } else {
        throw new Error(result.message || 'Failed to record payment');
      }
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInvoiceDisplayText = (invoice: InvoiceOption) => {
    const remaining = invoice.amount - (invoice.amountPaid || 0);
    return `#${invoice.invoiceNumber} — ${invoice.monthRange} ($${remaining.toFixed(2)} remaining)`;
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  // What value should the Select show? Map empty invoiceId → our sentinel
  const selectValue = newPayment.invoiceId === '' ? GENERAL_PAYMENT_VALUE : newPayment.invoiceId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record New Payment</DialogTitle>
          <DialogDescription>
            Apply a payment to a specific invoice, or post it directly to the
            tenant&apos;s balance as a general payment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Invoice Selection — now optional */}
          <div className="grid gap-2">
            <Label htmlFor="create-invoice">
              Apply To{' '}
              <span className="text-muted-foreground font-normal text-xs">
                (optional)
              </span>
            </Label>
            <Select
              key={`${tenantId}-${invoices.length}`}
              value={selectValue}
              onValueChange={handleInvoiceSelect}
              disabled={isLoadingInvoices}
            >
              <SelectTrigger id="create-invoice">
                <SelectValue
                  placeholder={
                    isLoadingInvoices ? 'Loading invoices...' : 'Select an invoice or general payment'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {/* Always show the general payment option at the top */}
                <SelectItem value={GENERAL_PAYMENT_VALUE}>
                  <span className="font-medium">General Payment — Apply to Balance</span>
                </SelectItem>

                {invoices.length > 0 && (
                  <>
                    {/* Visual separator text — not a real separator component to keep it simple */}
                    <SelectItem value="__divider__" disabled className="text-xs text-muted-foreground py-1">
                      ── Unpaid Invoices ──
                    </SelectItem>
                    {invoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {getInvoiceDisplayText(invoice)}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            {newPayment.invoiceId === '' && (
              <p className="text-xs text-muted-foreground">
                No invoice selected — payment will be posted directly to the tenant&apos;s balance.
              </p>
            )}
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
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreatePayment}
            disabled={isSubmitting || isLoadingInvoices}
          >
            {isSubmitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}