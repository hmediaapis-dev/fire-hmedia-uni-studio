
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
} from "@/components/ui/alert-dialog"

export default function BillingPage() {
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
              invoice.id.toLowerCase().includes(lowercasedTerm) ||
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
    setConfirmAction(() => onConfirm); // Use a function to avoid issues with stale state
    setIsConfirmOpen(true);
  }

  const handleMarkAsPaid = async (invoice: Invoice) => {
    showConfirmationDialog(
        "Confirm Payment",
        `Are you sure you want to mark invoice ${invoice.id} as fully paid? This will create a payment record for $${invoice.amount.toFixed(2)}.`,
        async () => {
            try {
                await recordPayment({
                    tenantId: invoice.tenantId,
                    amount: invoice.amount,
                    paymentMethod: 'Other', // Or prompt for method
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
          <h2 className="text-3xl font-bold tracking-tight">Billing</h2>
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
            <Button>
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
              <TableHead>Invoice ID</TableHead>
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
              .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())
              .map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-sm">{invoice.id}</TableCell>
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
                        <DropdownMenuItem>View Invoice</DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleMarkAsPaid(invoice)}
                            disabled={invoice.status !== 'unpaid'}
                        >
                          Mark as Paid
                        </DropdownMenuItem>
                         <DropdownMenuItem 
                            onClick={() => handleVoidInvoice(invoice)}
                            disabled={invoice.status === 'void' || invoice.status === 'paid'}
                         >
                          Void Invoice
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteInvoice(invoice)}
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
    </>
  );
}
