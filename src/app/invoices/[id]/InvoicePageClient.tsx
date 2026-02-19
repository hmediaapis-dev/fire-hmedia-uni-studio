'use client';

import { useState, useEffect } from 'react';
import { PrintableInvoice } from '@/components/PrintableInvoice';
import { getInvoices } from '@/services/invoices';
import { getTenants } from '@/services/tenants';
import { getUnits } from '@/services/units'; // Assuming you have this
import type { Invoice, Tenant, Unit } from '@/types';

export default function InvoicePageClient({ id }: { id: string }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [unitFallbackName, setUnitFallbackName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInvoiceData = async () => {
      try {
        setIsLoading(true);
        
        // Get the invoice
        const invoices = await getInvoices();
        const foundInvoice = invoices.find(inv => inv.id === id);
        
        if (!foundInvoice) {
          setInvoice(null);
          return;
        }
        
        setInvoice(foundInvoice);
        
        // Get related data
        const [tenants, units] = await Promise.all([
          getTenants(),
          getUnits() // Or however you fetch units
        ]);
        
        const foundTenant = tenants.find(t => t.id === foundInvoice.tenantId);
        setTenant(foundTenant || null);

        if (foundInvoice.unitId) {
          const foundUnit = units.find(u => u.id === foundInvoice.unitId);
          //console.log('Found unit:', foundUnit, 'for unitId:', foundInvoice.unitId);

          if (foundUnit) {
            // Use the actual unit from Firestore
            setUnit(foundUnit);
            setUnitFallbackName(null);
          } else {
            // Use the exact text as fallback
            setUnit(null);
            setUnitFallbackName(foundInvoice.unitId);
          }
        }
        
      } catch (error) {
        console.error("Failed to fetch invoice:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInvoiceData();
  }, [id]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="p-8 text-center">Invoice not found</div>;
  }

  return <PrintableInvoice 
    invoice={invoice} 
    tenant={tenant} 
    unit={unit}
    unitFallbackName={unitFallbackName}
  />;
}