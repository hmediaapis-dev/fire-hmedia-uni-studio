"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import {
  Home,
  Warehouse,
  DollarSign,
  FileText,
  ArrowLeft,
  Pencil,
  Trash2
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TenantReportSelector } from "@/components/TenantReportSelector";

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
  units?: string[];
  notes?: string;
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedTenant, setEditedTenant] = useState<Tenant | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Load tenant
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
          joinDate: data.joinDate?.toDate?.() ?? data.joinDate,
        } as Tenant);
      } catch (err) {
        console.error(err);
        setError("Failed to load tenant");
      }
    };
    loadTenant();
  }, [tenantId]);

  // Load invoices
  useEffect(() => {
    if (!tenantId) return;
    const loadInvoices = async () => {
      try {
        const functions = getFunctions();
        const getTenantInvoices = httpsCallable(functions, "getTenantInvoices");

        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 120);

        const response: any = await getTenantInvoices({
          tenantId,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          limit: 20,
        });

        const processedInvoices = (response.data.invoices || []).map((inv: any) => ({
          ...inv,
          dueDate: inv.dueDate?.toDate?.() ?? (inv.dueDate ? new Date(inv.dueDate) : null),
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

  // Load units
  useEffect(() => {
    if (!tenant?.units || tenant.units.length === 0) return;
    const loadUnits = async () => {
      try {
        const unitsQuery = query(
          collection(db, "units"),
          where("__name__", "in", tenant.units)
        );
        const snapshot = await getDocs(unitsQuery);
        setUnits(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Unit[]);
      } catch (err) {
        console.error("Failed to load units:", err);
      }
    };
    loadUnits();
  }, [tenant?.units]);

  // Safe date formatter
  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return "—";
      return format(d, "LLL dd, yyyy");
    } catch {
      return "—";
    }
  };

  const handleOpenEditDialog = () => {
    if (tenant) {
      setEditedTenant({ ...tenant });
      setIsEditDialogOpen(true);
    }
  };

  const handleEditTenantInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const field = e.target.id.replace("edit-", "");
    setEditedTenant(prev => prev ? { ...prev, [field]: e.target.value } : null);
  };

  const handleUpdateTenant = async () => {
    if (!editedTenant || !tenantId) return;
    try {
      await updateDoc(doc(db, "tenants", tenantId), {
        name: editedTenant.name,
        email: editedTenant.email ?? "",
        phone: editedTenant.phone ?? "",
        address: editedTenant.address ?? "",
        balance: editedTenant.balance ?? 0,
        notes: editedTenant.notes ?? "",
      });
      setTenant(editedTenant);
      setIsEditDialogOpen(false);
      toast({ title: "Success", description: `"${editedTenant.name}" updated successfully.` });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not update tenant.", variant: "destructive" });
    }
  };

  const handleConfirmDelete = async () => {
    if (!tenant || !tenantId) return;
    try {
      await deleteDoc(doc(db, "tenants", tenantId));
      toast({ title: "Success", description: `"${tenant.name}" deleted.` });
      router.push("/tenants");
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not delete tenant.", variant: "destructive" });
      setIsDeleteDialogOpen(false);
    }
  };

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

  return (
    <div className="container mx-auto p-6 max-w-6xl h-screen flex flex-col">
      <Button
        variant="ghost"
        onClick={() => router.push("/tenants")}
        className="mb-6 self-start"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to tenants
      </Button>

      <div className="bg-card rounded-lg border shadow-sm flex flex-col flex-1 min-h-0">
        {/* Header — fixed, never scrolls */}
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{tenant.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Joined on {tenant.joinDate ? format(tenant.joinDate, "MMMM d, yyyy") : "N/A"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleOpenEditDialog}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                {tenant.email && <p className="text-sm text-muted-foreground">{tenant.email}</p>}
                {tenant.phone && <p className="text-sm text-muted-foreground">{tenant.phone}</p>}
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
                  <p className="text-2xl font-bold">{tenant.units?.length ?? 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <DollarSign className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Current Balance</p>
                  <p className="text-2xl font-bold">${(tenant.balance ?? 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Total Rent</p>
                  <p className="text-2xl font-bold">${(tenant.rent ?? 0).toFixed(2)}</p>
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
                            {invoice.invoiceNumber ?? invoice.id.slice(0, 8)}
                          </TableCell>
                          <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={invoice.status === "paid" ? "secondary" : "destructive"}
                              className={
                                invoice.status === "paid"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                  : ""
                              }
                            >
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">${invoice.amount.toFixed(2)}</TableCell>
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

            <Separator />

            {/* Report Generator */}
            <div>
              <h4 className="text-lg font-semibold mb-3">Generate Report</h4>
              <div className="flex items-center justify-center">
                <TenantReportSelector tenantId={tenant.id} />
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer — fixed, never scrolls */}
        <div className="p-6 border-t flex justify-end flex-shrink-0">
          <Button variant="outline" onClick={() => router.push("/tenants")}>
            Close
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>Update the details for {editedTenant?.name}.</DialogDescription>
          </DialogHeader>
          {editedTenant && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" value={editedTenant.name} onChange={handleEditTenantInputChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" value={editedTenant.email ?? ""} onChange={handleEditTenantInputChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" value={editedTenant.phone ?? ""} onChange={handleEditTenantInputChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input id="edit-address" value={editedTenant.address ?? ""} onChange={handleEditTenantInputChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-balance">Balance</Label>
                {/*<Input
                  id="edit-balance"
                  type="number"
                  value={editedTenant.balance ?? 0}
                  onChange={(e) =>
                    setEditedTenant(prev => prev ? { ...prev, balance: parseFloat(e.target.value) || 0 } : null)
                  }
                />*/}
                <p className="text-gray-500">${editedTenant.balance}</p>
                <input type="hidden" id="edit-balance" value={editedTenant.balance} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea id="edit-notes" value={editedTenant.notes ?? ""} onChange={handleEditTenantInputChange} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateTenant}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete {tenant.name}?</DialogTitle>
            <DialogDescription>
              This will permanently remove them from the system and unassign them from any units. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete Tenant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}