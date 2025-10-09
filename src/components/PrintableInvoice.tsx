import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Printer, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import type { Invoice, Tenant, Unit } from '@/types';


const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getStatusBadge = (status: Invoice['status']) => {
  const config = {
    paid: { icon: CheckCircle, label: 'Paid', className: 'bg-green-100 text-green-800' },
    unpaid: { icon: Clock, label: 'Unpaid', className: 'bg-yellow-100 text-yellow-800' },
    void: { icon: XCircle, label: 'Void', className: 'bg-gray-100 text-gray-800' },
    'partially-paid': { icon: AlertCircle, label: 'Partially Paid', className: 'bg-blue-100 text-blue-800' },
  };

  const { icon: Icon, label, className } = config[status];
  
  return (
    <Badge className={`${className} flex items-center gap-1 w-fit`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

export function PrintableInvoice({ 
    invoice, 
    tenant, 
    unit, 
    unitFallbackName 
  }: { 
    invoice: Invoice;
    tenant: Tenant | null;
    unit?: Unit | null;
    unitFallbackName?: string | null;
  }) {
  const handlePrint = () => {
    window.print();
  };

  const balance = invoice.amount - (invoice.amountPaid || 0);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Button 
          onClick={handlePrint} 
          className="print:hidden mb-6 gap-2"
        >
          <Printer className="w-4 h-4" />
          Print Invoice
        </Button>
        
        <Card className="print:shadow-none print:border-0">
          <CardContent className="p-12">
            {/* Header */}
            <div className="flex justify-between items-start mb-12">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">INVOICE</h1>
                <p className="text-gray-600">Invoice #POPS-A{invoice.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 mb-2">Pop's Storage</div>
                <p className="text-gray-600">802 N Main St</p>
                <p className="text-gray-600">Lindale, TX 75771</p>
                <p className="text-gray-600">(903) 882-9961</p>
              </div>
            </div>

            {/* Bill To & Invoice Info */}
            <div className="grid grid-cols-2 gap-8 mb-12">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
                <p className="text-lg font-medium text-gray-900">{tenant?.name || 'Unknown Tenant'}</p>
                {tenant?.email && (
                  <p className="text-gray-600">{tenant.email}</p>
                )}
                  {unit && (<p className="text-gray-600"> Unit: {(unit?.name  || 'N/A')}</p>)}<p className="text-gray-600">{unitFallbackName && (unitFallbackName || 'N/A')}</p>
              </div>
              <div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invoice Date:</span>
                    <span className="font-medium">{invoice.createdAt ? formatDate(invoice.createdAt) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Due Date:</span>
                    <span className="font-medium">{formatDate(invoice.dueDate)}</span>
                  </div>
                  {invoice.paidDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paid Date:</span>
                      <span className="font-medium text-green-600">{formatDate(invoice.paidDate)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-gray-600">Status:</span>
                    {getStatusBadge(invoice.status)}
                  </div>
                </div>
              </div>
            </div>

            {/* Amount Details */}
            <div className="border-t border-b border-gray-200 py-6 mb-8">
              <div className="space-y-4">
                <div className="flex text-small">
                  <span className="font-semibold text-gray-600">For&nbsp;{invoice && (invoice.monthRange || 'N/A')}&nbsp;{unit && (<span className="font-semibold text-gray-600">Unit&nbsp;</span>)}</span>
                  <span className="font-semibold">{(unit?.name  || unitFallbackName || 'N/A')}</span>
                </div>
                <div className="flex text-xs">
                  <span className="text-gray-600">Notes:&nbsp;</span>
                  <span className="font-semibold">{invoice && (invoice.notes || 'None')}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">Invoice Amount:</span>
                  <span className="font-semibold">{formatCurrency(invoice.amount)}</span>
                </div>
                {invoice.amountPaid !== undefined && invoice.amountPaid > 0 && (
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="font-semibold text-green-600">-{formatCurrency(invoice.amountPaid)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Total Due */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">
                  {balance > 0 ? 'Balance Due:' : 'Total Due:'}
                </span>
                <span className={`text-3xl font-bold ${balance > 0 ? 'text-gray-900' : 'text-green-600'}`}>
                  {formatCurrency(Math.abs(balance))}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                Thank you for your business!
              </p>
              <p className="text-xs text-gray-400 text-center mt-2">
                Please make payment by the due date to avoid late fees.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        @media print {
          @page {
            margin: 0.5in;
            size: letter;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}

// Demo with sample data
/*export default function App() {
  const sampleInvoice: Invoice = {
    id: 'INV-2024-001',
    tenantId: 'TENANT-12345',
    unitId: 'Unit 4B',
    amount: 1500.00,
    dueDate: new Date('2025-10-01'),
    paidDate: new Date('2025-09-28'),
    status: 'paid',
    createdAt: new Date('2025-09-01'),
    amountPaid: 1500.00,
  };

  return <PrintableInvoice invoice={sampleInvoice} />;
}*/