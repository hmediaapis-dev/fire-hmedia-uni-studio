'use client';

import { useState, useEffect } from 'react';
import { TenantReport } from '@/components/TenantReport';
import { getInvoices } from '@/services/invoices';
import { getPayments } from '@/services/payments';
import { getTenants } from '@/services/tenants';
import type { Invoice, Payment, Tenant } from '@/types';

export default function ReportPageClient({ 
  tenantId,
  dateFrom,
  dateTo
}: { 
  tenantId: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const dateRange = dateFrom && dateTo 
    ? { from: new Date(dateFrom), to: new Date(dateTo) }
    : undefined;

  useEffect(() => {
    const loadReportData = async () => {
      try {
        setIsLoading(true);
        
        const [allInvoices, allPayments, tenants] = await Promise.all([
          getInvoices(),
          getPayments(),
          getTenants()
        ]);
        
        const foundTenant = tenants.find(t => t.id === tenantId);
        setTenant(foundTenant || null);
        
        // Filter by tenant
        let tenantInvoices = allInvoices.filter(inv => inv.tenantId === tenantId);
        let tenantPayments = allPayments.filter(pay => pay.tenantId === tenantId);
        
        // Filter by date range if provided
        if (dateRange) {
          tenantInvoices = tenantInvoices.filter(inv => 
            inv.dueDate >= dateRange.from && inv.dueDate <= dateRange.to
          );
          tenantPayments = tenantPayments.filter(pay => 
            pay.paymentDate >= dateRange.from && pay.paymentDate <= dateRange.to
          );
        }
        
        setInvoices(tenantInvoices);
        setPayments(tenantPayments);
        
      } catch (error) {
        console.error("Failed to fetch report data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadReportData();
  }, [tenantId, dateFrom, dateTo]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading report...</div>;
  }

  if (!tenant) {
    return <div className="p-8 text-center">Tenant not found</div>;
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