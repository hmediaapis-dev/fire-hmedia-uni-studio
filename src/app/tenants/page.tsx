
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
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle, User, Warehouse, DollarSign, FileText, Home, Search, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Tenant, Unit, Invoice } from '@/types';
import { Separator } from '@/components/ui/separator';
import { getTenants, addTenant, updateTenant, deleteTenant } from '@/services/tenants';
import { getUnits } from '@/services/units';
import { getInvoices } from '@/services/invoices';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';

export default function TenantsPage() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [newTenant, setNewTenant] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tenantsData, unitsData, invoicesData] = await Promise.all([
        getTenants(),
        getUnits(),
        getInvoices(),
      ]);
      const sortedTenants = tenantsData.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setTenants(sortedTenants);
      setUnits(unitsData);
      setInvoices(invoicesData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({
        title: "Error",
        description: "Failed to load data from the database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const filteredTenants = useMemo(() => {
    if (!searchTerm) return tenants;
    return tenants.filter(tenant => 
        tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tenants, searchTerm]);

  const handleEditClick = (tenant: Tenant) => {
    setSelectedTenant({ ...tenant });
    setIsEditDialogOpen(true);
  };
  
  const handleViewDetailsClick = (tenant: Tenant) => {
    setViewingTenant(tenant);
    setIsViewDialogOpen(true);
  };
  
  const handleDeleteClick = (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setIsDeleteDialogOpen(true);
  };

  const handleNewTenantInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setNewTenant((prev) => ({ ...prev, [id]: value }));
  };
  
  const handleEditTenantInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    if (selectedTenant) {
        setSelectedTenant(prev => prev ? ({ ...prev, [id.replace('edit-','')]: value }) : null);
    }
  };

  const handleAddTenant = async () => {
    if (!newTenant.name || !newTenant.email) {
      toast({
        title: "Validation Error",
        description: "Name and Email are required.",
        variant: "destructive",
      });
      return;
    }
    try {
      const newTenantData: Omit<Tenant, 'id'> = {
        ...newTenant,
        units: [],
        rent: 0,
        balance: 0,
        joinDate: new Date(),
      };
      const tenantId = await addTenant(newTenantData);
      setTenants((prev) => [...prev, { id: tenantId, ...newTenantData }]);
      setNewTenant({ name: '', email: '', phone: '', address: '', notes: '' });
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Tenant added successfully.",
      });
      await loadData();
    } catch (error) {
      console.error("Failed to add tenant:", error);
      toast({
        title: "Error",
        description: "Could not add new tenant.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTenant = async () => {
    if (!selectedTenant) return;
    try {
        const { id, ...tenantData } = selectedTenant;
        await updateTenant(id, tenantData);
        await loadData(); // Refresh data
        setIsEditDialogOpen(false);
        toast({
            title: "Success",
            description: "Tenant updated successfully.",
        });
    } catch (error) {
        console.error("Failed to update tenant:", error);
        toast({
            title: "Error",
            description: "Could not update tenant.",
            variant: "destructive",
        });
    }
  };

  const handleConfirmDelete = async () => {
    if (!tenantToDelete) return;
    try {
      await deleteTenant(tenantToDelete.id);
      await loadData();
      toast({
        title: "Success",
        description: `Tenant "${tenantToDelete.name}" deleted.`,
      });
    } catch (error) {
      console.error("Failed to delete tenant:", error);
      toast({
        title: "Error",
        description: "Could not delete tenant.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setTenantToDelete(null);
    }
  };

  const tenantUnits = viewingTenant ? units.filter(unit => viewingTenant.units.includes(unit.id)) : [];
  const tenantInvoices = viewingTenant ? invoices.filter(invoice => invoice.tenantId === viewingTenant.id).slice(0, 5) : [];

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Tenants</h2>
            <p className="text-muted-foreground">
              Manage your tenants and their information.
            </p>
          </div>
          <div className="flex items-center gap-2">
             <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search tenants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 sm:w-[300px]"
                />
                {searchTerm && (
                  <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setSearchTerm('')}
                  >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Clear search</span>
                  </Button>
                )}
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Tenant
                </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add New Tenant</DialogTitle>
                    <DialogDescription>
                    Enter the details for the new tenant.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                          id="name"
                          placeholder="John Doe"
                          value={newTenant.name}
                          onChange={handleNewTenantInputChange}
                      />
                    </div>
                    <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="john.doe@example.com"
                        value={newTenant.email}
                        onChange={handleNewTenantInputChange}
                    />
                    </div>
                    <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                        id="phone"
                        placeholder="555-123-4567"
                        value={newTenant.phone}
                        onChange={handleNewTenantInputChange}
                    />
                    </div>
                    <div className="grid gap-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                        id="address"
                        placeholder="123 Main St, Anytown, USA"
                        value={newTenant.address}
                        onChange={handleNewTenantInputChange}
                    />
                    </div>
                    <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                        id="notes"
                        placeholder="Initial notes about the tenant..."
                        value={newTenant.notes}
                        onChange={handleNewTenantInputChange}
                    />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddTenant}>Save Tenant</Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-center">Units</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading tenants from Firestore...</TableCell>
                </TableRow>
              ) : filteredTenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {searchTerm ? 'No tenants match your search.' : 'No tenants found. Add one to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTenants.map((tenant) => (
                <TableRow 
                  key={tenant.id}
                  onClick={() => handleViewDetailsClick(tenant)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">{tenant.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {tenant.phone}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{tenant.units.length}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={tenant.balance > 0 ? 'destructive' : 'outline'}
                    >
                      ${tenant.balance.toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(tenant.joinDate, 'LLL dd, yyyy')}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => handleViewDetailsClick(tenant)}>View Details</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleEditClick(tenant)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteClick(tenant)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )))}
            </TableBody>
          </Table>
        </div>
      </div>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Tenant</DialogTitle>
              <DialogDescription>
                Update the details for {selectedTenant?.name}.
              </DialogDescription>
            </DialogHeader>
            
              {selectedTenant && (
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input id="edit-name" value={selectedTenant.name} onChange={handleEditTenantInputChange}/>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={selectedTenant.email}
                      onChange={handleEditTenantInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input id="edit-phone" value={selectedTenant.phone} onChange={handleEditTenantInputChange} />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="edit-address">Address</Label>
                    <Input id="edit-address" value={selectedTenant.address} onChange={handleEditTenantInputChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-balance">Balance</Label>
                    <Input
                      id="edit-balance"
                      type="number"
                      value={selectedTenant.balance}
                      onChange={(e) => setSelectedTenant(prev => prev ? ({ ...prev, balance: parseFloat(e.target.value) || 0 }) : null)}
                    />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="edit-notes">Notes</Label>
                    <Textarea
                      id="edit-notes"
                      value={selectedTenant.notes}
                      onChange={handleEditTenantInputChange}
                    />
                  </div>
                </div>
              )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateTenant}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

       <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-3xl grid-rows-[auto_1fr_auto]">
            <DialogHeader>
              <DialogTitle>{viewingTenant?.name}</DialogTitle>
              <DialogDescription>
                Joined on {viewingTenant ? format(viewingTenant.joinDate, 'MMMM d, yyyy') : ''}
              </DialogDescription>
            </DialogHeader>
            {viewingTenant && (
            <>
                <ScrollArea className="max-h-[60vh] h-full">
                    <div className="grid gap-6 p-1 pr-6">
                        <div className="grid grid-cols-2">
                            <div>
                                <p className="text-sm text-muted-foreground">{viewingTenant.email}</p>
                                <p className="text-sm text-muted-foreground">{viewingTenant.phone}</p>
                            </div>
                            <div className="text-right">
                            <p className="text-sm text-muted-foreground flex items-center justify-end gap-2">
                                    <Home className="h-4 w-4" /> 
                                    {viewingTenant.address}
                                </p>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3 rounded-lg border p-3">
                                <Warehouse className="h-6 w-6 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Rented Units</p>
                                    <p className="text-2xl font-bold">{viewingTenant.units.length}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-lg border p-3">
                                <DollarSign className="h-6 w-6 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Current Balance</p>
                                    <p className="text-2xl font-bold">${viewingTenant.balance.toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-lg border p-3">
                                <FileText className="h-6 w-6 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Total Rent</p>
                                    <p className="text-2xl font-bold">${viewingTenant.rent.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                        
                        <Separator />

                        <div>
                            <h4 className="text-lg font-semibold mb-2">Rented Units</h4>
                            {tenantUnits.length > 0 ? (
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
                                        {tenantUnits.map(unit => (
                                            <TableRow key={unit.id}>
                                                <TableCell className="font-medium">{unit.name}</TableCell>
                                                <TableCell>{unit.size}</TableCell>
                                                <TableCell className="text-right">${unit.rent.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                            </Table>
                            </div>
                            ) : (<p className="text-sm text-muted-foreground">No units rented.</p>)}
                        </div>

                        <div>
                            <h4 className="text-lg font-semibold mb-2">Recent Invoices</h4>
                            {tenantInvoices.length > 0 ? (
                            <div className="border rounded-lg">
                            <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice ID</TableHead>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tenantInvoices.map(invoice => (
                                            <TableRow key={invoice.id}>
                                                <TableCell className="font-mono text-xs">{invoice.id}</TableCell>
                                                <TableCell>{format(invoice.dueDate, 'LLL dd, yyyy')}</TableCell>
                                                <TableCell><Badge variant={invoice.status === 'paid' ? 'secondary' : 'destructive'}  className={
                                                    invoice.status === 'paid'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                    : ''
                                                }>{invoice.status}</Badge></TableCell>
                                                <TableCell className="text-right">${invoice.amount.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                            </Table>
                            </div>
                            ) : (<p className="text-sm text-muted-foreground">No recent invoices.</p>)}
                        </div>
                        
                        {viewingTenant.notes && (
                            <div>
                                <h4 className="text-lg font-semibold mb-2">Notes</h4>
                                <p className="text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border">{viewingTenant.notes}</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                </DialogFooter>
            </>
            )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete {tenantToDelete?.name}?</DialogTitle>
            <DialogDescription>
              This will permanently remove them from the system and unassign them from any units. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
