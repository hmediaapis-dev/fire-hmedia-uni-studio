
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
import { MoreHorizontal, PlusCircle, Search, Trash2, X } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Payment, Invoice, Tenant } from '@/types';
import { getInvoices } from '@/services/invoices';
import { getPayments, deletePayment } from '@/services/payments';
import { getTenants } from '@/services/tenants';
import { CreatePaymentDialog } from '@/components/CreatePaymentDialog';
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

export default function PaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]); //added for invoice data
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [isCreatePaymentDialogOpen, setIsCreatePaymentDialogOpen] = useState(false); // Add state for create dialog

  const loadData = useCallback(async () => {
    try {
        setIsLoading(true);
        const [paymentsData, tenantsData, invoicesData] = await Promise.all([
            getPayments(),
            getTenants(),
            getInvoices()
        ]);
        setPayments(paymentsData);
        setTenants(tenantsData);
        setInvoices(invoicesData);
    } catch (error) {
        console.error("Failed to fetch payments data:", error);
        toast({
            title: "Error",
            description: "Failed to load payments data from the database.",
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

  const invoicesById = useMemo<Record<string, number>>(
    () => Object.fromEntries(invoices.map(invoice => [invoice.id, invoice.invoiceNumber])),
    [invoices]
  );

  const filteredPayments = useMemo(() => {
    let filtered = payments;

    // Filter by search term
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(payment => {
          const tenant = tenantsById[payment.tenantId];
          return (
              payment.id.toLowerCase().includes(lowercasedTerm) ||
              tenant?.name.toLowerCase().includes(lowercasedTerm) ||
              tenant?.email.toLowerCase().includes(lowercasedTerm) ||
              payment.paymentMethod.toLowerCase().includes(lowercasedTerm) ||
              (payment.transactionId && payment.transactionId.toLowerCase().includes(lowercasedTerm))
          )
      });
    }

    // Filter by date range
    if (dateRange?.from && dateRange?.to) {
        filtered = filtered.filter(payment => {
            const paymentDate = payment.paymentDate;
            return paymentDate >= dateRange.from! && paymentDate <= dateRange.to!;
        });
    }

    return filtered;
  }, [payments, searchTerm, tenantsById, dateRange]);
  
  const showDeleteConfirmation = (payment: Payment) => {
    setPaymentToDelete(payment);
    setIsConfirmOpen(true);
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;

    try {
      await deletePayment(paymentToDelete.id);
      toast({ title: "Success", description: "Payment deleted successfully. Tenant balance and invoices have been reverted." });
      await loadData(); // Refresh data
    } catch (error: any) {
      console.error("Failed to delete payment:", error);
      toast({ title: "Error", description: error.message || "Could not delete the payment.", variant: "destructive" });
    } finally {
        setIsConfirmOpen(false);
        setPaymentToDelete(null);
    }
  };


  return (
    <>
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div id="payments-page-header" className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payments</h2>
          <p className="text-muted-foreground">
            View all recorded payments.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search payments..."
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
            <Button onClick={() => setIsCreatePaymentDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Manual Payment
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
              <TableHead>Tenant</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading payments from Firestore...</TableCell>
                </TableRow>
            ) : filteredPayments.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="text-center">
                        {searchTerm || dateRange?.from ? 'No payments match your filters.' : 'No payments found.'}
                    </TableCell>
                </TableRow>
            ) : (filteredPayments
              .sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime())
              .map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div className="font-medium">
                      {tenantsById[payment.tenantId]?.name || 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tenantsById[payment.tenantId]?.email || 'N/A'}
                    </div>
                  </TableCell>
                   <TableCell>
                    {format(payment.paymentDate, 'LLL dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {payment.status === 'void' ? (
                      <Badge variant="destructive">Void</Badge>
                    ) : (
                      <Badge variant="outline">{payment.paymentMethod}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                     {payment.invoiceIds.map(id => (
                        <span key={id} className="font-mono text-xs">{invoicesById[id] ?? id}</span>
                     ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${payment.amount.toFixed(2)}
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
                        {/* Show void info for voided payments */}
                        {payment.status === 'void' && (
                          <DropdownMenuItem disabled className="text-muted-foreground">
                            {/*<span className="mr-2 h-4 w-4" /> Makes a column space for the icon*/}
                            Payment Voided
                          </DropdownMenuItem>
                        )}
                        {payment.status !== 'void' && (
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => showDeleteConfirmation(payment)}
                          >
                            Void Payment
                          </DropdownMenuItem>
                        )}
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
            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
            <AlertDialogDescription>
                Are you sure you want to void this payment of <strong>${paymentToDelete?.amount.toFixed(2)}</strong> for <strong>{tenantsById[paymentToDelete?.tenantId || '']?.name}</strong>?
                This action cannot be undone and will revert the tenant's balance and associated invoices.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment} className="bg-destructive hover:bg-destructive/90">
                Confirm Void
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <CreatePaymentDialog 
      isOpen={isCreatePaymentDialogOpen}
      onOpenChange={setIsCreatePaymentDialogOpen}
    />

    </>
  );
}
