'use client';

import { useState, useEffect } from 'react';
import { TenantReport } from '@/components/TenantReport';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { getPaymentsByTenant } from '@/services/payments';
import { getTenant } from '@/services/tenants';
import type { Invoice, Payment, Tenant } from '@/types';

const getTenantInvoices = httpsCallable<
  { tenantId: string; startDate?: string; endDate?: string; limit?: number; lastDocId?: string | null },
  { invoices: Invoice[]; lastDocId: string | null; hasMore: boolean; count: number }
>(functions, 'getTenantInvoices');

export default function ReportPageClient({
  tenantId,
  dateFrom,
  dateTo,
}: {
  tenantId: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateRange =
    dateFrom && dateTo
      ? { from: new Date(dateFrom), to: new Date(dateTo) }
      : undefined;

  useEffect(() => {
    const loadReportData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // All three calls are scoped to this tenant — no full collection reads
        const [tenantData, paymentsData, invoicesResult] = await Promise.all([
          getTenant(tenantId),
          getPaymentsByTenant(tenantId),
          getTenantInvoices({
            tenantId,
            ...(dateRange && {
              startDate: dateRange.from.toISOString(),
              endDate: dateRange.to.toISOString(),
            }),
          }),
        ]);

        if (!tenantData) {
          setError('Tenant not found');
          return;
        }

        setTenant(tenantData);

        // Invoices come back already filtered by tenant and date from the cloud function
        setInvoices(invoicesResult.data.invoices ?? []);

        // Filter payments by date range client-side if needed
        // (getPaymentsByTenant doesn't support date filtering yet — add it to the
        //  service/cloud function later if report performance becomes a concern)
        const filteredPayments = dateRange
          ? paymentsData.filter(
              (p) =>
                p.paymentDate >= dateRange.from && p.paymentDate <= dateRange.to
            )
          : paymentsData;

        setPayments(filteredPayments);
      } catch (err) {
        console.error('Failed to fetch report data:', err);
        setError('Failed to load report data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadReportData();
  }, [tenantId, dateFrom, dateTo]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading report...</div>;
  }

  if (error || !tenant) {
    return (
      <div className="p-8 text-center text-destructive">
        {error ?? 'Tenant not found'}
      </div>
    );
  }

  return (
    <TenantReport
      tenant={tenant}
      invoices={invoices}
      payments={payments}
      dateRange={dateRange}
    />
  );
}