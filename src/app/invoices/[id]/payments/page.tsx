'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InvoicePaymentsList } from '@/components/InvoicePaymentsList';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

type Invoice = {
  id: string;
  invoiceNumber: number;
  amount: number;
  amountPaid?: number;
};

export default function InvoicePaymentsPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) return;

    const loadInvoice = async () => {
      try {
        /*console.log('Loading invoice:', invoiceId);*/
        const invoiceDoc = await getDoc(doc(db, 'invoices', invoiceId));
        
        if (invoiceDoc.exists()) {
          /*console.log('Invoice found:', invoiceDoc.data());*/
          setInvoice({
            id: invoiceDoc.id,
            ...invoiceDoc.data()
          } as Invoice);
        } else {
          console.log('Invoice not found');
        }
      } catch (error: any) {
        console.error('Error loading invoice:', error);
        console.error('Error details:', error.message, error.code);
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header with back button */}
      <div className="mb-6">
        <Link href={`/invoices/${invoiceId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoice
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Invoice Payments</h1>
        <p className="text-muted-foreground mt-1">
          Viewing all payments for this invoice
        </p>
      </div>

      {/* Payments List Component */}
      <InvoicePaymentsList invoiceId={invoiceId} invoice={invoice || undefined} />
    </div>
  );
}