'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
import { MoreVertical, PlusCircle, User, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import type { Unit, Tenant } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { getUnits, assignTenantToUnit, unassignTenantFromUnit, addUnit, updateUnit, deleteUnit } from '@/services/units';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { TenantSearchPicker } from '@/components/TenantSearchPicker';


export default function UnitsPage() {
  const { toast } = useToast();
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isAddUnitDialogOpen, setIsAddUnitDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUnassignDialogOpen, setIsUnassignDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Data states
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [unitToEdit, setUnitToEdit] = useState<Unit | null>(null);
  const [unitToUnassign, setUnitToUnassign] = useState<Unit | null>(null);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);

  // Selected tenant from the search picker
  const [selectedTenant, setSelectedTenant] = useState<Pick<Tenant, 'id' | 'name'> | null>(null);

  const [newUnit, setNewUnit] = useState({
    name: '',
    size: '',
    rent: 0,
    gateCode: '',
  });

  const loadUnits = async () => {
    try {
      setIsLoading(true);
      const unitsData = await getUnits();
      const sortedUnits = unitsData.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );
      setUnits(sortedUnits);
    } catch (error) {
      console.error("Failed to fetch units:", error);
      toast({
        title: "Error",
        description: "Failed to load units from the database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const handleAssignTenantClick = (unit: Unit) => {
    setSelectedUnit(unit);
    setSelectedTenant(null);
    setIsAssignDialogOpen(true);
  };

  const handleEditClick = (unit: Unit) => {
    setUnitToEdit({ ...unit });
    setIsEditDialogOpen(true);
  };

  const handleUnassignClick = (unit: Unit) => {
    setUnitToUnassign(unit);
    setIsUnassignDialogOpen(true);
  };

  const handleDeleteClick = (unit: Unit) => {
    setUnitToDelete(unit);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmUnassign = async () => {
    if (!unitToUnassign || !unitToUnassign.tenantId) return;
    try {
      await unassignTenantFromUnit(unitToUnassign.id, unitToUnassign.tenantId);
      await loadUnits();
      toast({ title: "Success", description: "Tenant unassigned successfully." });
    } catch (error) {
      console.error("Failed to unassign tenant:", error);
      toast({ title: "Error", description: "Could not unassign tenant.", variant: "destructive" });
    } finally {
      setIsUnassignDialogOpen(false);
      setUnitToUnassign(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!unitToDelete) return;
    try {
      await deleteUnit(unitToDelete.id, unitToDelete.tenantId);
      await loadUnits();
      toast({ title: "Success", description: `Unit "${unitToDelete.name}" deleted successfully.` });
    } catch (error) {
      console.error("Failed to delete unit:", error);
      toast({ title: "Error", description: "Could not delete the unit.", variant: "destructive" });
    } finally {
      setIsDeleteDialogOpen(false);
      setUnitToDelete(null);
    }
  };

  const handleAssignTenant = async () => {
    if (!selectedUnit || !selectedTenant) return;
    try {
      const oldTenantId = selectedUnit.tenantId;
      await assignTenantToUnit(selectedUnit.id, selectedTenant.id, selectedTenant.name, oldTenantId);
      await loadUnits();
      setIsAssignDialogOpen(false);
      setSelectedUnit(null);
      setSelectedTenant(null);
      toast({ title: "Success", description: "Tenant assigned successfully." });
    } catch (error) {
      console.error("Failed to assign tenant:", error);
      toast({ title: "Error", description: "Could not assign tenant.", variant: "destructive" });
    }
  };

  const handleNewUnitInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewUnit(prev => ({ ...prev, [id]: id === 'rent' ? parseFloat(value) || 0 : value }));
  };

  const handleEditUnitInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!unitToEdit) return;
    const { id, value } = e.target;
    const fieldName = id.replace('edit-', '');
    setUnitToEdit(prev => ({ ...prev!, [fieldName]: fieldName === 'rent' ? parseFloat(value) || 0 : value }));
  };

  const handleAddUnit = async () => {
    if (!newUnit.name || !newUnit.size || newUnit.rent <= 0) {
      toast({
        title: "Validation Error",
        description: "Unit Name, Size, and a valid Rent amount are required.",
        variant: "destructive",
      });
      return;
    }
    try {
      await addUnit({ ...newUnit, status: 'available' });
      await loadUnits();
      setIsAddUnitDialogOpen(false);
      setNewUnit({ name: '', size: '', rent: 0, gateCode: '' });
      toast({ title: "Success", description: "New unit added successfully." });
    } catch (error) {
      console.error("Failed to add unit:", error);
      toast({ title: "Error", description: "Could not add new unit.", variant: "destructive" });
    }
  };

  const handleUpdateUnit = async () => {
    if (!unitToEdit) return;
    try {
      const { id, ...dataToUpdate } = unitToEdit;
      await updateUnit(id, dataToUpdate);
      await loadUnits();
      setIsEditDialogOpen(false);
      setUnitToEdit(null);
      toast({ title: "Success", description: "Unit updated successfully." });
    } catch (error) {
      console.error("Failed to update unit:", error);
      toast({ title: "Error", description: "Could not update the unit.", variant: "destructive" });
    }
  };

  const getStatusClass = (status: 'available' | 'rented' | 'maintenance') => {
    switch (status) {
      case 'available':   return 'border-green-500 bg-green-50 dark:bg-green-950';
      case 'rented':      return 'border-red-500 bg-red-50 dark:bg-red-950';
      case 'maintenance': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950';
    }
  };

  const getStatusBadgeVariant = (status: 'available' | 'rented' | 'maintenance') => {
    switch (status) {
      case 'available':   return 'secondary';
      case 'rented':      return 'destructive';
      case 'maintenance': return 'outline';
    }
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Units</h2>
            <p className="text-muted-foreground">View and manage all your units.</p>
          </div>

          {/* Add Unit Dialog */}
          <Dialog open={isAddUnitDialogOpen} onOpenChange={setIsAddUnitDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Unit</DialogTitle>
                <DialogDescription>
                  Enter the details for the new unit. It will be marked as 'available'.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Unit Name (e.g., Unit 101)</Label>
                  <Input id="name" value={newUnit.name} onChange={handleNewUnitInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="size">Size (e.g., 10x10)</Label>
                  <Input id="size" value={newUnit.size} onChange={handleNewUnitInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rent">Monthly Rent ($)</Label>
                  <Input id="rent" type="number" value={newUnit.rent} onChange={handleNewUnitInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gateCode">Gate Code</Label>
                  <Input id="gateCode" value={newUnit.gateCode} onChange={handleNewUnitInputChange} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddUnitDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddUnit}>Save Unit</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Units Grid */}
        {isLoading ? (
          <p>Loading units from Firestore...</p>
        ) : units.length === 0 ? (
          <p className="text-muted-foreground p-4">No units found. Add one to get started.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {units.map((unit) => (
              <Card key={unit.id} className={cn('flex flex-col', getStatusClass(unit.status))}>
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
                      <DropdownMenuItem onSelect={() => handleEditClick(unit)}>Edit Unit</DropdownMenuItem>
                      {unit.status === 'rented' ? (
                        <>
                          <DropdownMenuItem onClick={() => handleAssignTenantClick(unit)}>
                            Re-assign Tenant
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUnassignClick(unit)}>
                            Unassign Tenant
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem onClick={() => handleAssignTenantClick(unit)}>
                          Assign Tenant
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteClick(unit)}>
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
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
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
                      {/* Name shown from unit data if stored, otherwise just ID */}
                      <span>{unit.tenantName ?? unit.tenantId}</span>
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
        )}
      </div>

      {/* Assign Tenant Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Tenant to {selectedUnit?.name}</DialogTitle>
            <DialogDescription>
              Search and select a tenant to assign to this unit.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <TenantSearchPicker
              excludeTenantId={selectedUnit?.tenantId}
              selectedTenantId={selectedTenant?.id}
              onSelect={(tenant) => setSelectedTenant(tenant)}
            />
            {/* Confirm selection display */}
            {selectedTenant && (
              <p className="text-sm text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{selectedTenant.name}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignTenant} disabled={!selectedTenant}>
              Assign Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Unit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {unitToEdit?.name}</DialogTitle>
            <DialogDescription>Update the details for this unit.</DialogDescription>
          </DialogHeader>
          {unitToEdit && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Unit Name</Label>
                <Input id="edit-name" value={unitToEdit.name} onChange={handleEditUnitInputChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-size">Size</Label>
                <Input id="edit-size" value={unitToEdit.size} onChange={handleEditUnitInputChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-rent">Monthly Rent ($)</Label>
                <Input id="edit-rent" type="number" value={unitToEdit.rent} onChange={handleEditUnitInputChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-gateCode">Gate Code</Label>
                <Input id="edit-gateCode" value={unitToEdit.gateCode} onChange={handleEditUnitInputChange} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateUnit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unassign Tenant Confirmation Dialog */}
      <Dialog open={isUnassignDialogOpen} onOpenChange={setIsUnassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Unassignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to unassign the tenant from{' '}
              <strong>{unitToUnassign?.name}</strong>? This will make the unit available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUnassignDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmUnassign}>Confirm Unassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Unit Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Unit</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{' '}
              <strong>{unitToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete Unit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}