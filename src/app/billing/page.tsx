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
import { mockInvoices, mockTenants } from '@/data/mock-data';
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle } from 'lucide-react';

export default function BillingPage() {
  const tenantsById = Object.fromEntries(
    mockTenants.map((tenant) => [tenant.id, tenant])
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Billing</h2>
          <p className="text-muted-foreground">
            Manage invoices and payments.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockInvoices
              .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())
              .map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-sm">{invoice.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {tenantsById[invoice.tenantId]?.name || 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tenantsById[invoice.tenantId]?.email || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${invoice.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {format(invoice.dueDate, 'LLL dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.status === 'paid'
                          ? 'secondary'
                          : invoice.status === 'unpaid'
                          ? 'destructive'
                          : 'outline'
                      }
                      className={
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : invoice.status === 'void' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' : ''
                      }
                    >
                      {invoice.status}
                    </Badge>
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
                        <DropdownMenuItem>View Invoice</DropdownMenuItem>
                        <DropdownMenuItem disabled={invoice.status !== 'unpaid'}>
                          Mark as Paid
                        </DropdownMenuItem>
                         <DropdownMenuItem disabled={invoice.status === 'void'}>
                          Void Invoice
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
