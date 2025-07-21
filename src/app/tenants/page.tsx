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
import { mockInvoices, mockTenants, mockUnits } from '@/data/mock-data';
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle, User, Warehouse, DollarSign, FileText } from 'lucide-react';
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
import { useState } from 'react';
import type { Tenant } from '@/types';
import { Separator } from '@/components/ui/separator';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>(mockTenants);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  const handleEditClick = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsEditDialogOpen(true);
  };
  
  const handleViewDetailsClick = (tenant: Tenant) => {
    setViewingTenant(tenant);
    setIsViewDialogOpen(true);
  };

  const handleNewTenantInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setNewTenant((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddTenant = () => {
    if (!newTenant.name || !newTenant.email) {
      // Basic validation
      alert('Name and Email are required.');
      return;
    }
    const newTenantData: Tenant = {
      id: `t${Date.now()}`,
      ...newTenant,
      units: [],
      rent: 0,
      balance: 0,
      joinDate: new Date(),
    };
    setTenants((prev) => [...prev, newTenantData]);
    setNewTenant({ name: '', email: '', phone: '', notes: '' });
    setIsAddDialogOpen(false);
  };

  const tenantUnits = viewingTenant ? mockUnits.filter(unit => viewingTenant.units.includes(unit.id)) : [];
  const tenantInvoices = viewingTenant ? mockInvoices.filter(invoice => invoice.tenantId === viewingTenant.id).slice(0, 5) : [];

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
              {tenants.map((tenant) => (
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
                        <DropdownMenuItem onSelect={() => handleEditClick(tenant)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleViewDetailsClick(tenant)}>View Details</DropdownMenuItem>
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
                    <Input id="edit-name" defaultValue={selectedTenant.name} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      defaultValue={selectedTenant.email}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input id="edit-phone" defaultValue={selectedTenant.phone} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-balance">Balance</Label>
                    <Input
                      id="edit-balance"
                      type="number"
                      defaultValue={selectedTenant.balance}
                    />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="edit-notes">Notes</Label>
                    <Textarea
                      id="edit-notes"
                      defaultValue={selectedTenant.notes}
                    />
                  </div>
                </div>
              )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => setIsEditDialogOpen(false)}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

       <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{viewingTenant?.name}</DialogTitle>
              <DialogDescription>
                Joined on {viewingTenant ? format(viewingTenant.joinDate, 'MMMM d, yyyy') : ''}
              </DialogDescription>
            </DialogHeader>
            {viewingTenant && (
            <>
                <div className="grid gap-6 pt-4">
                    <div className="flex items-center justify-between">
                         <div className="text-right">
                            <p className="text-sm text-muted-foreground">{viewingTenant.email}</p>
                            <p className="text-sm text-muted-foreground">{viewingTenant.phone}</p>
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
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold mb-2">Recent Invoices</h4>
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
                    </div>
                    
                     {viewingTenant.notes && (
                        <div>
                            <h4 className="text-lg font-semibold mb-2">Notes</h4>
                            <p className="text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border">{viewingTenant.notes}</p>
                        </div>
                     )}


                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                </DialogFooter>
            </>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
