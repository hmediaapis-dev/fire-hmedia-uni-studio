"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { 
  Home, 
  Warehouse, 
  DollarSign, 
  FileText,
  ArrowLeft
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Invoice {
  id: string;
  invoiceNumber?: string;
  dueDate: Date | null;
  amount: number;
  status: string;
}

interface Unit {
  id: string;
  name: string;
  size: string;
  rent: number;
}

interface Tenant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  joinDate?: Date;
  balance?: number;
  rent?: number;
  units?: string[]; // Array of unit IDs
  notes?: string;
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    const loadTenant = async () => {
      try {
        const snap = await getDoc(doc(db, "tenants", tenantId));
        if (!snap.exists()) {
          setError("Tenant not found");
          return;
        }
        const data = snap.data();
        setTenant({ 
          id: snap.id, 
          ...data,
          joinDate: data.joinDate?.toDate?.() || data.joinDate,
        } as Tenant);
      } catch (err) {
        console.error(err);
        setError("Failed to load tenant");
      }
    };

    loadTenant();
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;

    const loadInvoices = async () => {
      try {
        const functions = getFunctions();
        const getTenantInvoices = httpsCallable(functions, "getTenantInvoices");

        // Default date range: today → 120 days ago
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 120);

        const response: any = await getTenantInvoices({
          tenantId,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          limit: 20,
        });

        // Process invoices to handle date conversion
        const processedInvoices = (response.data.invoices || []).map((inv: any) => ({
          ...inv,
          dueDate: inv.dueDate?.toDate?.() || (inv.dueDate ? new Date(inv.dueDate) : null)
        }));

        setInvoices(processedInvoices);
      } catch (err) {
        console.error(err);
        setError("Failed to load invoices");
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [tenantId]);

  // Load units data
  useEffect(() => {
    if (!tenant?.units || tenant.units.length === 0) return;

    const loadUnits = async () => {
      try {
        const unitsQuery = query(
          collection(db, "units"),
          where("__name__", "in", tenant.units)
        );
        const snapshot = await getDocs(unitsQuery);
        const unitsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Unit[];
        setUnits(unitsData);
      } catch (err) {
        console.error("Failed to load units:", err);
      }
    };

    loadUnits();
  }, [tenant?.units]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">Tenant not found</div>
      </div>
    );
  }

  const topInvoices = invoices.slice(0, 5);

  // Safe date formatter
  const formatDate = (date: Date | null) => {
    if (!date) return '—';
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return '—';
      return format(dateObj, 'LLL dd, yyyy');
    } catch {
      return '—';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Button
        variant="ghost"
        onClick={() => router.push("/tenants")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to tenants
      </Button>

      <div className="bg-card rounded-lg border shadow-sm">
        {/* Header */}
        <div className="p-6 border-b">
          <h1 className="text-3xl font-bold">{tenant.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Joined on {tenant.joinDate ? format(tenant.joinDate, 'MMMM d, yyyy') : 'N/A'}
          </p>
        </div>

        <ScrollArea className="max-h-[calc(100vh-200px)]">
          <div className="p-6 space-y-6">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                {tenant.email && (
                  <p className="text-sm text-muted-foreground">{tenant.email}</p>
                )}
                {tenant.phone && (
                  <p className="text-sm text-muted-foreground">{tenant.phone}</p>
                )}
              </div>
              <div className="text-right">
                {tenant.address && (
                  <p className="text-sm text-muted-foreground flex items-center justify-end gap-2">
                    <Home className="h-4 w-4" />
                    {tenant.address}
                  </p>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <Warehouse className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Rented Units</p>
                  <p className="text-2xl font-bold">{tenant.units?.length || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <DollarSign className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Current Balance</p>
                  <p className="text-2xl font-bold">${(tenant.balance || 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Total Rent</p>
                  <p className="text-2xl font-bold">${(tenant.rent || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Rented Units */}
            <div>
              <h4 className="text-lg font-semibold mb-3">Rented Units</h4>
              {units.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unit</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="text-right">Rent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map(unit => (
                        <TableRow key={unit.id}>
                          <TableCell className="font-medium">{unit.name}</TableCell>
                          <TableCell>{unit.size}</TableCell>
                          <TableCell className="text-right">${unit.rent.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No units rented.</p>
              )}
            </div>

            {/* Recent Invoices */}
            <div>
              <h4 className="text-lg font-semibold mb-3">Recent Invoices</h4>
              {topInvoices.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topInvoices.map(invoice => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-xs">
                            {invoice.invoiceNumber || invoice.id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            {formatDate(invoice.dueDate)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={invoice.status === 'paid' ? 'secondary' : 'destructive'}
                              className={
                                invoice.status === 'paid'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  : ''
                              }
                            >
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            ${invoice.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent invoices.</p>
              )}
            </div>

            {/* Notes */}
            {tenant.notes && (
              <div>
                <h4 className="text-lg font-semibold mb-3">Notes</h4>
                <p className="text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800/50 p-4 rounded-md border">
                  {tenant.notes}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end">
          <Button variant="outline" onClick={() => router.push("/tenants")}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}