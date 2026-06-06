import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
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
import { useToast } from '@/hooks/use-toast';

type NewInvoiceForm = {
  unitId: string;
  monthRange: string;
  amount: string;
  dueDate: string;
  notes: string;
};

type CreateInvoiceDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  refetchInvoices: () => void;
};

const EMPTY_FORM: NewInvoiceForm = {
  unitId: '',
  monthRange: '',
  amount: '',
  dueDate: '',
  notes: '',
};

export function CreateInvoiceDialog({
  isOpen,
  onOpenChange,
  tenantId,
  refetchInvoices,
}: CreateInvoiceDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newInvoice, setNewInvoice] = useState<NewInvoiceForm>(EMPTY_FORM);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setNewInvoice(prev => ({ ...prev, [id.replace('create-', '')]: value }));
  };

  const resetForm = () => setNewInvoice(EMPTY_FORM);

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.monthRange || !newInvoice.amount || !newInvoice.dueDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(newInvoice.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid amount.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const createInvoice = httpsCallable(functions, 'createInvoice');
      const result = await createInvoice({
        tenantId,
        unitId: newInvoice.unitId || undefined,
        monthRange: newInvoice.monthRange,
        amount,
        dueDate: newInvoice.dueDate,
        notes: newInvoice.notes,
      });

      const data = result.data as { id: string; invoiceNumber: number; success: boolean };
      console.log('Invoice created:', data);

      toast({ title: 'Invoice Created', description: 'Invoice created successfully.' });
      refetchInvoices();
      handleClose();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invoice. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="create-unitId">Unit ID (Optional)</Label>
            <Input
              id="create-unitId"
              value={newInvoice.unitId}
              onChange={handleInputChange}
              placeholder="e.g., Unit 101"
            />
          </div>

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
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleCreateInvoice} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}