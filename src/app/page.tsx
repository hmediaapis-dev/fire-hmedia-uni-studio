'use client';
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
import { Users, Warehouse, DollarSign, Activity } from 'lucide-react';
import { DashboardChart } from '@/components/dashboard-chart';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import type { Tenant, Unit, Invoice } from '@/types';
import { getTenants } from '@/services/tenants';
import { getUnits } from '@/services/units';
import { getInvoices } from '@/services/invoices';
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setIsLoading(true);
        const [tenantsData, unitsData, invoicesData] = await Promise.all([
          getTenants(),
          getUnits(),
          getInvoices(),
        ]);
        setTenants(tenantsData);
        setUnits(unitsData);
        setInvoices(invoicesData);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data from the database.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, [toast]);

  const totalUnits = units.length;
  const availableUnits = units.filter(
    (unit) => unit.status === 'available'
  ).length;
  const activeTenants = tenants.length;
  const openBalance = invoices
    .filter((invoice) => invoice.status === 'unpaid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const recentInvoices = invoices
    .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())
    .slice(0, 5);
  const tenantsById = Object.fromEntries(
    tenants.map((tenant) => [tenant.id, tenant])
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
       {isLoading ? <p>Loading dashboard data from Firestore...</p> : (
      <>
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
                {totalUnits > 0 ? (( (totalUnits - availableUnits) / totalUnits) * 100).toFixed(1) : 0}%
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
               {recentInvoices.length > 0 ? (
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
              ) : (
                <p className="text-sm text-muted-foreground p-4">No recent invoices found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </>
      )}
    </div>
  );
}
