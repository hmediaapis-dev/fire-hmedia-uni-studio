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
import { mockTenants } from '@/data/mock-data';
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
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

export default function TenantsPage() {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleEditClick = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsEditDialogOpen(true);
  };

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
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Tenant
          </Button>
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
              {mockTenants.map((tenant) => (
                <TableRow key={tenant.id}>
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
                  <TableCell>
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
                        <DropdownMenuItem>View Details</DropdownMenuItem>
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
        <DialogContent className="sm:max-w-md p-0">
          <Card className="border-0">
            <CardHeader>
              <CardTitle>Edit Tenant</CardTitle>
              <CardDescription>
                Update the details for {selectedTenant?.name}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTenant && (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" defaultValue={selectedTenant.name} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue={selectedTenant.email}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" defaultValue={selectedTenant.phone} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="balance">Balance</Label>
                    <Input
                      id="balance"
                      type="number"
                      defaultValue={selectedTenant.balance}
                    />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      defaultValue={selectedTenant.notes}
                    />
                  </div>
                </div>
              )}
            </CardContent>
             <DialogFooter className="px-6 pb-6">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => setIsEditDialogOpen(false)}>Save Changes</Button>
            </DialogFooter>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}
