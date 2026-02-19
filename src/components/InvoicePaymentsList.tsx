'use client';

import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, Calendar, CreditCard, FileText, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type Payment = {
  id: string;
  tenantId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'Cash' | 'Check' | 'Credit Card' | 'Other';
  invoiceIds: string[];
  transactionId?: string;
  notes?: string;
  status: 'complete' | 'void';
  voidedDate?: Date;
  voidedBy?: string;
};

type Invoice = {
  id: string;
  invoiceNumber: number;
  amount: number;
  amountPaid?: number;
};

interface InvoicePaymentsListProps {
  invoiceId: string;
  invoice?: Invoice; // Optional invoice data passed from parent
}

export function InvoicePaymentsList({ invoiceId, invoice }: InvoicePaymentsListProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) return;

    const loadPayments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        /*console.log('Calling getInvoicePayments with:', invoiceId);*/
        const getPayments = httpsCallable(functions, 'getInvoicePaymentsByInvoiceId');
        const result = await getPayments({ invoiceId });

        /*console.log('Payments result:', result);*/

        const data = result.data as {
          payments: Payment[];
          count: number;
        };

        /*console.log('Payments data:', data);*/

        // Convert date strings back to Date objects
        const processedPayments = data.payments.map(payment => ({
          ...payment,
          paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
          voidedDate: payment.voidedDate ? new Date(payment.voidedDate) : undefined,
        }));

        setPayments(processedPayments);
      } catch (err: any) {
        console.error('Error loading payments:', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        console.error('Error details:', err.details);
        setError(err.message || 'Failed to load payments');
        toast({
          title: 'Error',
          description: err.message || 'Failed to load payments.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPayments();
  }, [invoiceId, toast]);

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'Cash':
        return <DollarSign className="h-5 w-5" />;
      case 'Check':
        return <FileText className="h-5 w-5" />;
      case 'Credit Card':
        return <CreditCard className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  const totalPaid = payments
    .filter(p => p.status === 'complete')
    .reduce((sum, p) => sum + p.amount, 0);

  const remainingBalance = invoice 
    ? (invoice.amount - (invoice.amountPaid || 0))
    : 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invoice Summary Card */}
      {invoice && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Invoice Number</p>
                <p className="text-2xl font-bold font-mono">#{invoice.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Remaining Balance</p>
                <p className={`text-2xl font-bold ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${remainingBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Payment Summary</span>
            <span className="text-2xl font-bold text-green-600">
              ${totalPaid.toFixed(2)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Payments</p>
              <p className="text-lg font-semibold">{payments.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Active Payments</p>
              <p className="text-lg font-semibold">
                {payments.filter(p => p.status === 'complete').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Payment History</h3>
        
        {payments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No payments found for this invoice.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {payments.map((payment) => (
              <Card
                key={payment.id}
                className={payment.status === 'void' ? 'opacity-60 border-destructive' : ''}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left side - Payment details */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {getPaymentMethodIcon(payment.paymentMethod)}
                        </div>
                        <div>
                          <h4 className="font-semibold">{payment.paymentMethod}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(payment.paymentDate, 'MMMM dd, yyyy')}
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        {payment.transactionId && (
                          <div>
                            <p className="text-muted-foreground">Transaction ID</p>
                            <p className="font-mono">{payment.transactionId}</p>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-muted-foreground">Payment ID</p>
                          <p className="font-mono text-xs">{payment.id}</p>
                        </div>

                        {payment.invoiceIds.length > 1 && (
                          <div>
                            <p className="text-muted-foreground">Applied to Invoices</p>
                            <p className="font-semibold">{payment.invoiceIds.length} invoices</p>
                          </div>
                        )}
                      </div>

                      {payment.notes && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">Notes</p>
                          <p className="text-sm">{payment.notes}</p>
                        </div>
                      )}

                      {payment.status === 'void' && (
                        <div className="pt-2 border-t border-destructive">
                          <div className="flex items-center gap-2 text-destructive">
                            <XCircle className="h-4 w-4" />
                            <p className="text-sm font-semibold">VOIDED</p>
                          </div>
                          {payment.voidedDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Voided on {format(payment.voidedDate, 'MMM dd, yyyy')}
                              {payment.voidedBy && ` by ${payment.voidedBy}`}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side - Amount */}
                    <div className="text-right">
                      <p className="text-3xl font-bold">
                        ${payment.amount.toFixed(2)}
                      </p>
                      <Badge
                        variant={payment.status === 'complete' ? 'secondary' : 'destructive'}
                        className={
                          payment.status === 'complete'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : ''
                        }
                      >
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}