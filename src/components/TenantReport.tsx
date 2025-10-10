import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Printer, Download } from 'lucide-react';
import { useMemo } from 'react';
import type { Invoice, Payment, Tenant } from '@/types';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const exportToCSV = (tenant: Tenant, invoices: Invoice[], payments: Payment[], dateRange?: { from: Date; to: Date }) => {
  const rows = [];
  
  const dateRangeText = dateRange 
    ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
    : 'All Time';
  rows.push([`Tenant Report: ${tenant.name}`]);
  rows.push([`Date Range: ${dateRangeText}`]);
  rows.push([`Generated: ${formatDate(new Date())}`]);
  rows.push([]);
  
  rows.push(['INVOICES']);
  rows.push(['Invoice ID', 'Amount', 'Due Date', 'Status', 'Amount Paid', 'Balance']);
  invoices.forEach(inv => {
    const balance = inv.amount - (inv.amountPaid || 0);
    rows.push([
      inv.id,
      inv.amount.toFixed(2),
      formatDate(inv.dueDate),
      inv.status,
      (inv.amountPaid || 0).toFixed(2),
      balance.toFixed(2)
    ]);
  });
  rows.push([]);
  
  rows.push(['PAYMENTS']);
  rows.push(['Payment ID', 'Amount', 'Date', 'Method', 'Status']);
  payments.forEach(pay => {
    rows.push([
      pay.id,
      pay.amount.toFixed(2),
      formatDate(pay.paymentDate),
      pay.paymentMethod,
      pay.status
    ]);
  });
  
  const csvContent = rows.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tenant-report-${tenant.id}-${Date.now()}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

export function TenantReport({ 
  tenant, 
  invoices, 
  payments,
  dateRange 
}: { 
  tenant: Tenant;
  invoices: Invoice[];
  payments: Payment[];
  dateRange?: { from: Date; to: Date };
}) {
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    exportToCSV(tenant, invoices, payments, dateRange);
  };

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);
  const balance = totalBilled - totalPaid;

  const paymentToInvoiceNumbers = useMemo<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    
    payments.forEach(payment => {
      const invoiceNumbers: string[] = [];
      
      payment.invoiceIds.forEach(invoiceId => {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (invoice) {
          invoiceNumbers.push(invoice.invoiceNumber.toString());
        }
      });
      
      if (invoiceNumbers.length > 0) {
        map[payment.id] = invoiceNumbers;
      }
    });
    
    return map;
  }, [payments, invoices]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="print:hidden mb-6 flex gap-2">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Print Report
          </Button>
          <Button onClick={handleExportCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
        
        <Card className="print:shadow-none print:border-0">
          <CardContent className="p-12">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Pops Storage Tenant Financial Report</h1>
              <div className="text-gray-600">
                <p className="text-xl font-semibold">{tenant.name}</p>
                {tenant.email && <p>{tenant.email}</p>}
                <p className="mt-2">
                  {dateRange 
                    ? `Period: ${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
                    : 'Period: All Time'
                  }
                </p>
                <p className="text-sm">Generated: {formatDate(new Date())}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Billed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalBilled)}</div>
                  <p className="text-xs text-gray-500 mt-1">{invoices.length} invoices</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Paid</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
                  <p className="text-xs text-gray-500 mt-1">{payments.length} payments</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${balance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatCurrency(balance)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {balance > 0 ? 'Outstanding' : 'Paid in full'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Invoices</h2>
              {invoices.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No invoices found for this period.</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Invoice ID</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Due Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Paid</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices
                      .sort((a, b) => b.invoiceNumber - a.invoiceNumber)
                      .map((invoice) => {
                        const invBalance = invoice.amount - (invoice.amountPaid || 0);
                        return (
                          <tr key={invoice.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-sm">{invoice.invoiceNumber}</td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatCurrency(invoice.amount)}
                            </td>
                            <td className="px-4 py-3">{formatDate(invoice.dueDate)}</td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={invoice.status === 'paid' ? 'secondary' : 'destructive'}
                                className={
                                  invoice.status === 'paid'
                                    ? 'bg-green-100 text-green-800'
                                    : invoice.status === 'void'
                                    ? 'bg-gray-100 text-gray-800'
                                    : ''
                                }
                              >
                                {invoice.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatCurrency(invoice.amountPaid || 0)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatCurrency(invBalance)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4">Payments</h2>
              {payments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No payments found for this period.</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Payment For Invoice</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Method</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments
                      .sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime())
                      .map((payment) => (
                        <tr key={payment.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm">{paymentToInvoiceNumbers[payment.id]}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-4 py-3">{formatDate(payment.paymentDate)}</td>
                          <td className="px-4 py-3 capitalize">{payment.paymentMethod}</td>
                          <td className="px-4 py-3">
                          <Badge 
                            variant="secondary" 
                            className={
                              payment.status === 'complete' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {payment.status}
                          </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

//Demo
/*export default function App() {
  const sampleTenant: Tenant = {
    id: 'TENANT-001',
    name: 'John Smith',
    email: 'john.smith@example.com',
  };

  const sampleInvoices: Invoice[] = [
    {
      id: 'INV-001',
      tenantId: 'TENANT-001',
      amount: 1500,
      dueDate: new Date('2025-09-01'),
      status: 'paid',
      amountPaid: 1500,
    },
    {
      id: 'INV-002',
      tenantId: 'TENANT-001',
      amount: 1500,
      dueDate: new Date('2025-10-01'),
      status: 'unpaid',
      amountPaid: 0,
    },
  ];

  const samplePayments: Payment[] = [
    {
      id: 'PAY-001',
      tenantId: 'TENANT-001',
      amount: 1500,
      paymentDate: new Date('2025-08-28'),
      paymentMethod: 'Credit Card',
      status: 'complete',
    },
  ];

  return (
    <TenantReport 
      tenant={sampleTenant}
      invoices={sampleInvoices}
      payments={samplePayments}
      dateRange={{ from: new Date('2025-09-01'), to: new Date('2025-10-31') }}
    />
  );
}*/