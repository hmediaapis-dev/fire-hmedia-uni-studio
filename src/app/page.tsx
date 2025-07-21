import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { mockTenants, mockUnits, mockInvoices } from '@/data/mock-data';
import { Users, Warehouse, DollarSign, Activity } from 'lucide-react';
import { DashboardChart } from '@/components/dashboard-chart';
import { format } from 'date-fns';

export default function DashboardPage() {
  const totalUnits = mockUnits.length;
  const availableUnits = mockUnits.filter(
    (unit) => unit.status === 'available'
  ).length;
  const activeTenants = mockTenants.length;
  const openBalance = mockInvoices
    .filter((invoice) => invoice.status === 'unpaid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const recentInvoices = mockInvoices
    .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())
    .slice(0, 5);
  const tenantsById = Object.fromEntries(
    mockTenants.map((tenant) => [tenant.id, tenant])
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnits}</div>
            <p className="text-xs text-muted-foreground">
              {availableUnits} available
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTenants}</div>
            <p className="text-xs text-muted-foreground">
              Across all properties
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Balances</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${openBalance.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total outstanding amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Occupancy Rate
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(( (totalUnits - availableUnits) / totalUnits) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Based on rented units
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Monthly revenue overview.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <DashboardChart />
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>
              A list of the most recent invoices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div className="font-medium">
                        {tenantsById[invoice.tenantId]?.name || 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {tenantsById[invoice.tenantId]?.email || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                    <TableCell>{format(invoice.dueDate, 'LLL dd, y')}</TableCell>
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
                            : ''
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
