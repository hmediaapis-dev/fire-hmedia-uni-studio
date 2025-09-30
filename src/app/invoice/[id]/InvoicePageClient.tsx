'use client';

import { useState, useEffect } from 'react';
import { PrintableInvoice } from '@/components/PrintableInvoice';
import { getInvoices } from '@/services/invoices';
import type { Invoice } from '@/types';

export default function InvoicePageClient({ id }: { id: string }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        setIsLoading(true);
        const invoices = await getInvoices();
        const foundInvoice = invoices.find(inv => inv.id === id);
        setInvoice(foundInvoice || null);
      } catch (error) {
        console.error("Failed to fetch invoice:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInvoice();
  }, [id]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="p-8 text-center">Invoice not found</div>;
  }

  return <PrintableInvoice invoice={invoice} />;
}