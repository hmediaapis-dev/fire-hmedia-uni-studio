'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { mockUnits, mockTenants } from '@/data/mock-data';
import { MoreVertical, PlusCircle, User, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { Unit, Tenant } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>(mockUnits);
  const [tenants, setTenants] = useState<Tenant[]>(mockTenants);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const tenantsById = Object.fromEntries(
    tenants.map((tenant) => [tenant.id, tenant])
  );

  const handleAssignTenantClick = (unit: Unit) => {
    setSelectedUnit(unit);
    setSelectedTenantId('');
    setIsAssignDialogOpen(true);
  };

  const handleUnassignTenant = (unitToUpdate: Unit) => {
    if (!unitToUpdate.tenantId) return;

    const oldTenantId = unitToUpdate.tenantId;

    // Update unit
    const updatedUnits = units.map((unit) =>
      unit.id === unitToUpdate.id
        ? { ...unit, status: 'available' as const, tenantId: undefined }
        : unit
    );
    setUnits(updatedUnits);

    // Update old tenant
    const updatedTenants = tenants.map((tenant) => {
      if (tenant.id === oldTenantId) {
        return {
          ...tenant,
          units: tenant.units.filter((uid) => uid !== unitToUpdate.id),
        };
      }
      return tenant;
    });
    setTenants(updatedTenants);
  };

  const handleAssignTenant = () => {
    if (!selectedUnit || !selectedTenantId) return;

    const oldTenantId = selectedUnit.tenantId;

    // Update unit status and tenantId
    const updatedUnits = units.map((unit) =>
      unit.id === selectedUnit.id
        ? { ...unit, status: 'rented' as const, tenantId: selectedTenantId }
        : unit
    );
    setUnits(updatedUnits);

    // Update tenants' unit lists
    const updatedTenants = tenants.map((tenant) => {
      // Add unit to new tenant
      if (tenant.id === selectedTenantId) {
        // Avoid adding duplicate unit id
        if (!tenant.units.includes(selectedUnit.id)) {
          return { ...tenant, units: [...tenant.units, selectedUnit.id] };
        }
      }
      // Remove unit from old tenant
      if (tenant.id === oldTenantId) {
        return {
          ...tenant,
          units: tenant.units.filter((uid) => uid !== selectedUnit.id),
        };
      }
      return tenant;
    });
    setTenants(updatedTenants);

    setIsAssignDialogOpen(false);
    setSelectedUnit(null);
  };

  const getStatusClass = (status: 'available' | 'rented' | 'maintenance') => {
    switch (status) {
      case 'available':
        return 'border-green-500 bg-green-50 dark:bg-green-950';
      case 'rented':
        return 'border-red-500 bg-red-50 dark:bg-red-950';
      case 'maintenance':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950';
    }
  };

  const getStatusBadgeVariant = (
    status: 'available' | 'rented' | 'maintenance'
  ) => {
    switch (status) {
      case 'available':
        return 'secondary';
      case 'rented':
        return 'destructive';
      case 'maintenance':
        return 'outline';
    }
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Units</h2>
            <p className="text-muted-foreground">
              View and manage all your units.
            </p>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Unit
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {units.map((unit) => (
            <Card
              key={unit.id}
              className={cn('flex flex-col', getStatusClass(unit.status))}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold">{unit.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem>Edit Unit</DropdownMenuItem>
                     {unit.status === 'rented' ? (
                      <>
                        <DropdownMenuItem onClick={() => handleAssignTenantClick(unit)}>
                          Re-assign Tenant
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUnassignTenant(unit)}>
                          Unassign Tenant
                        </DropdownMenuItem>
                      </>
                    ) : (
                       <DropdownMenuItem onClick={() => handleAssignTenantClick(unit)}>
                        Assign Tenant
                       </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      Delete Unit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex justify-between items-center mb-4">
                  <Badge variant={getStatusBadgeVariant(unit.status)} className="capitalize">
                      {unit.status}
                  </Badge>
                  <div className="text-xl font-semibold">
                    ${unit.rent.toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /mo
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Size: {unit.size}</p>
                <p className="text-sm text-muted-foreground">
                  Gate Code: <span className="font-mono">{unit.gateCode}</span>
                </p>
              </CardContent>
              <CardFooter>
                {unit.status === 'rented' && unit.tenantId && (
                  <div className="flex items-center text-sm">
                    <User className="h-4 w-4 mr-2 text-primary" />
                    <span>{tenantsById[unit.tenantId]?.name || 'N/A'}</span>
                  </div>
                )}
                {unit.status === 'maintenance' && (
                  <div className="flex items-center text-sm text-yellow-600 dark:text-yellow-400">
                    <Wrench className="h-4 w-4 mr-2" />
                    <span>Under Maintenance</span>
                  </div>
                )}
                {unit.status === 'available' && (
                  <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                    <span>Available for rent</span>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Tenant to {selectedUnit?.name}</DialogTitle>
            <DialogDescription>
              Select a tenant to assign to this unit. This will mark the unit as 'rented'.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-select">Select Tenant</Label>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger id="tenant-select">
                  <SelectValue placeholder="Select a tenant..." />
                </SelectTrigger>
                <SelectContent>
                  {tenants
                    .filter(tenant => tenant.id !== selectedUnit?.tenantId)
                    .map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignTenant} disabled={!selectedTenantId}>
              Assign Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
