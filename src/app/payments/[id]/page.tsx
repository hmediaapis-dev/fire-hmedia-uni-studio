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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle, Search, X } from 'lucide-react';
import { use, useState, useEffect, useMemo, useCallback } from 'react';
import type { Payment, Tenant } from '@/types';
import { getPaymentsByTenant, deletePayment } from '@/services/payments';
import { getTenant } from '@/services/tenants';
import { CreatePaymentDialog } from '@/components/CreatePaymentDialog';
import { useToast } from '@/hooks/use-toast';
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
} from '@/components/ui/alert-dialog';

// This page is accessed at /payments/[id] where id is the tenant ID
export default function TenantPaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tenantId } = use(params);
  const { toast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [isCreatePaymentDialogOpen, setIsCreatePaymentDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Only fetch THIS tenant's data — no large collection reads
      const [paymentsData, tenantData] = await Promise.all([
        getPaymentsByTenant(tenantId),
        getTenant(tenantId),
      ]);
      setPayments(paymentsData);
      setTenant(tenantData);
    } catch (error) {
      console.error('Failed to fetch tenant payment data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredPayments = useMemo(() => {
    let filtered = payments;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.id.toLowerCase().includes(term) ||
          p.paymentMethod.toLowerCase().includes(term) ||
          (p.transactionId && p.transactionId.toLowerCase().includes(term)) ||
          (p.notes && p.notes.toLowerCase().includes(term))
      );
    }

    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(
        (p) => p.paymentDate >= dateRange.from! && p.paymentDate <= dateRange.to!
      );
    }

    return filtered;
  }, [payments, searchTerm, dateRange]);

  const showDeleteConfirmation = (payment: Payment) => {
    setPaymentToDelete(payment);
    setIsConfirmOpen(true);
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      await deletePayment(paymentToDelete.id);
      toast({
        title: 'Success',
        description: 'Payment voided successfully.',
      });
      await loadData();
    } catch (error: any) {
      console.error('Failed to void payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not void the payment.',
        variant: 'destructive',
      });
    } finally {
      setIsConfirmOpen(false);
      setPaymentToDelete(null);
    }
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {tenant ? `${tenant.name} — Payments` : 'Payments'}
            </h2>
            <p className="text-muted-foreground">
              {tenant?.email || `Tenant ID: ${tenantId}`}
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
              Make A Payment
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
                <TableHead>Payment Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Invoice(s)</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading payments...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {searchTerm || dateRange?.from
                      ? 'No payments match your filters.'
                      : 'No payments found for this tenant.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments
                  .sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime())
                  .map((payment) => (
                    <TableRow key={payment.id}>
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
                        {payment.invoiceIds && payment.invoiceIds.length > 0 ? (
                          <div className="flex flex-col">
                            {payment.invoiceIds.map((id) => (
                              <span key={id} className="font-mono text-xs">
                                {id}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            General Payment
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {payment.notes || '—'}
                        </span>
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
                            {payment.status === 'void' ? (
                              <DropdownMenuItem disabled className="text-muted-foreground">
                                Payment Voided
                              </DropdownMenuItem>
                            ) : (
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
                  ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void this payment of{' '}
              <strong>${paymentToDelete?.amount.toFixed(2)}</strong>?{' '}
              {paymentToDelete?.invoiceIds && paymentToDelete.invoiceIds.length > 0
                ? 'This will revert the tenant balance and associated invoice(s).'
                : 'This will revert the amount from the tenant balance.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayment}
              className="bg-destructive hover:bg-destructive/90"
            >
              Confirm Void
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreatePaymentDialog
        isOpen={isCreatePaymentDialogOpen}
        onOpenChange={setIsCreatePaymentDialogOpen}
        tenantId={tenantId}
        refetchPayments={loadData}
      />
    </>
  );
}