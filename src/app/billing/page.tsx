'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from "next/link";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle, Search, X } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Invoice, Tenant } from '@/types';
import { getInvoices, updateInvoice, deleteInvoice } from '@/services/invoices';
import { getTenants } from '@/services/tenants';
import { recordPayment } from '@/services/payments';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/date-range-picker';
import type { DateRange } from 'react-day-picker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CreateInvoiceDialog } from '@/components/CreateInvoiceDialog';

export default function InvoicesPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDescription, setConfirmDescription] = useState('');

  // Create Invoice dialog state and related needs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Edit dialog state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
        setIsLoading(true);
        const [invoicesData, tenantsData] = await Promise.all([
            getInvoices(),
            getTenants()
        ]);
        setInvoices(invoicesData);
        setTenants(tenantsData);
    } catch (error) {
        console.error("Failed to fetch billing data:", error);
        toast({
            title: "Error",
            description: "Failed to load billing data from the database.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateInvoiceDialogClose = () => {
    // console.log('Dialog closed!');
    // Your logic here
    // loadData();
  };

  const tenantsById = useMemo(() => Object.fromEntries(
    tenants.map((tenant) => [tenant.id, tenant])
  ), [tenants]);

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    // Filter by search term
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice => {
          const tenant = tenantsById[invoice.tenantId];
          return (
              invoice.invoiceNumber.toString().toLowerCase().includes(lowercasedTerm) ||
              tenant?.name.toLowerCase().includes(lowercasedTerm) ||
              tenant?.email.toLowerCase().includes(lowercasedTerm)
          )
      });
    }

    // Filter by date range
    if (dateRange?.from && dateRange?.to) {
        filtered = filtered.filter(invoice => {
            const dueDate = invoice.dueDate;
            return dueDate >= dateRange.from! && dueDate <= dateRange.to!;
        });
    }

    return filtered;
  }, [invoices, searchTerm, tenantsById, dateRange]);

  const showConfirmationDialog = (title: string, description: string, onConfirm: () => void) => {
    setConfirmTitle(title);
    setConfirmDescription(description);
    setConfirmAction(() => onConfirm);
    setIsConfirmOpen(true);
  }

  const handleEditClick = (invoice: Invoice) => {
    if (invoice.status === 'paid' || invoice.status === 'void') {
      toast({
        title: "Cannot Edit",
        description: "Paid or voided invoices cannot be edited.",
        variant: "destructive",
      });
      return;
    }
    setSelectedInvoice({ ...invoice });
    setIsEditDialogOpen(true);
  };

  const handleEditInvoiceInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    if (selectedInvoice) {
      setSelectedInvoice(prev => prev ? ({ 
        ...prev, 
        [id.replace('edit-','')]: value 
      }) : null);
    }
  };

  const handleUpdateInvoice = async () => {
    if (!selectedInvoice) return;
    
    // Validation
    if (!selectedInvoice.dueDate) {
      toast({
        title: "Validation Error",
        description: "Due date is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { id, ...invoiceData } = selectedInvoice;
      const cleanedData = Object.fromEntries(
        Object.entries(invoiceData).filter(([_, value]) => value !== undefined)
      );
      await updateInvoice(id, cleanedData);
      await loadData();
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Invoice updated successfully.",
      });
    } catch (error) {
      console.error("Failed to update invoice:", error);
      toast({
        title: "Error",
        description: "Could not update invoice.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    showConfirmationDialog(
        "Confirm Payment",
        `Are you sure you want to mark invoice ${invoice.id} as fully paid? This will create a payment record for $${invoice.amount.toFixed(2)}.`,
        async () => {
            try {
                await recordPayment({
                    tenantId: invoice.tenantId,
                    amount: invoice.amount,
                    paymentMethod: 'Other',
                    status: 'complete',
                    invoiceIds: [invoice.id]
                });
                toast({ title: "Success", description: "Payment recorded successfully." });
                await loadData();
            } catch (error: any) {
                console.error("Failed to mark as paid:", error);
                toast({ title: "Error", description: error.message || "Could not record payment.", variant: "destructive" });
            }
        }
    );
  };

  const handleVoidInvoice = async (invoice: Invoice) => {
    showConfirmationDialog(
        "Confirm Void",
        `Are you sure you want to void invoice ${invoice.id}? This cannot be undone.`,
        async () => {
             try {
                await updateInvoice(invoice.id, { status: 'void' });
                toast({ title: "Success", description: "Invoice voided." });
                await loadData();
            } catch (error) {
                console.error("Failed to void invoice:", error);
                toast({ title: "Error", description: "Could not void the invoice.", variant: "destructive" });
            }
        }
    );
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
     showConfirmationDialog(
        "Confirm Deletion",
        `Are you sure you want to permanently delete invoice ${invoice.id}? This action is irreversible.`,
        async () => {
            try {
                await deleteInvoice(invoice.id);
                toast({ title: "Success", description: "Invoice deleted." });
                await loadData();
            } catch (error) {
                console.error("Failed to delete invoice:", error);
                toast({ title: "Error", description: "Could not delete the invoice.", variant: "destructive" });
            }
        }
    );
  };

  return (
    <>
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div id="billing-page-header" className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">
            Manage invoices and payments.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 sm:w-[300px]"
                />
                {searchTerm && (
                  <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setSearchTerm('')}
                  >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Clear search</span>
                  </Button>
                )}
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Invoice
            </Button>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <DateRangePicker onSelect={setDateRange} />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice Number</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">Loading invoices from Firestore...</TableCell>
            </TableRow>
          ) : filteredInvoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                {searchTerm || dateRange?.from ? 'No invoices match your filters.' : 'No invoices found.'}
              </TableCell>
            </TableRow>
          ) : (filteredInvoices
            .sort((a, b) => {
              if (b.invoiceNumber !== a.invoiceNumber) {
                return b.invoiceNumber - a.invoiceNumber;
              }
              const aTime = a.createdAt?.getTime() ?? 0;
              const bTime = b.createdAt?.getTime() ?? 0;
              return bTime - aTime;
            })
            .map((invoice) => (
                <TableRow key={invoice.invoiceNumber}>
                  <TableCell className="font-mono text-sm">{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {tenantsById[invoice.tenantId]?.name || 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tenantsById[invoice.tenantId]?.email || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${invoice.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {format(invoice.dueDate, 'LLL dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.status === 'paid'
                          ? 'secondary'
                          : invoice.status === 'unpaid'
                          ? 'destructive'
                          : 'outline'
                      }
                      className={
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : invoice.status === 'void' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' : ''
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Link href={`/invoice/${invoice.id}`}>
                            View Invoice
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={() => handleEditClick(invoice)}
                        >
                          Edit Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={() => handleMarkAsPaid(invoice)}
                            disabled={invoice.status !== 'unpaid'}
                        >
                          Mark as Paid
                        </DropdownMenuItem>
                         <DropdownMenuItem 
                            onSelect={() => handleVoidInvoice(invoice)}
                            disabled={invoice.status === 'void' || invoice.status === 'paid'}
                         >
                          Void Invoice
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            className="text-destructive"
                            onSelect={() => handleDeleteInvoice(invoice)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )))}
          </TableBody>
        </Table>
      </div>
    </div>

    {/* Edit Invoice Dialog */}
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
          <DialogDescription>
            Update the details for invoice #{selectedInvoice?.invoiceNumber}.
          </DialogDescription>
        </DialogHeader>
        
        {selectedInvoice && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <p>Invoice Number: {selectedInvoice.invoiceNumber}</p>
            </div>

            <div className="grid gap-2">
              <p>Tenant: {tenantsById[selectedInvoice.tenantId]?.name || 'N/A'}</p>
            </div>

            <div className="grid gap-2">
              <p>Amount: {selectedInvoice.amount}</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-monthRange">Month Range</Label>
              <Input
                id="edit-monthRange"
                value={selectedInvoice.monthRange || 'N/A'}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Input
                id="edit-status"
                value={selectedInvoice.status}
                disabled
                className="bg-muted capitalize"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-dueDate">Due Date</Label>
              <Input
                id="edit-dueDate"
                type="date"
                value={selectedInvoice.dueDate instanceof Date 
                  ? selectedInvoice.dueDate.toISOString().split('T')[0]
                  : ''}
                onChange={(e) => setSelectedInvoice(prev => prev ? ({ 
                  ...prev, 
                  dueDate: new Date(e.target.value)
                }) : null)}
              />
            </div>

            {selectedInvoice.notes !== undefined && (
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={selectedInvoice.notes || ''}
                  onChange={handleEditInvoiceInputChange}
                  placeholder="Add notes about this invoice..."
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdateInvoice}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog */}
    <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
                {confirmDescription}
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
                if(confirmAction) {
                    confirmAction();
                }
                setIsConfirmOpen(false);
            }}>
                Confirm
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    
    <CreateInvoiceDialog 
      isOpen={isCreateDialogOpen} 
      onOpenChange={setIsCreateDialogOpen}
      refetchInvoices={loadData}
      onClose={handleCreateInvoiceDialogClose}
    />

    </>
  );
}