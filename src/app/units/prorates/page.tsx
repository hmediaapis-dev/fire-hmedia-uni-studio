'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Calculator, CalendarIcon } from 'lucide-react';
import { getUnits } from '@/services/units';
import type { Unit } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { format, getDaysInMonth, differenceInDays, endOfMonth, startOfDay } from 'date-fns';

export default function ProratesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Date constants for proration calculation
  const today = startOfDay(new Date());
  const daysInCurrentMonth = getDaysInMonth(today);
  const lastDayOfMonth = endOfMonth(today);
  const remainingDays = differenceInDays(lastDayOfMonth, today) + 1; // Including today

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const data = await getUnits();
        // Sort units numerically/alphabetically by name
        const sorted = data.sort((a, b) => 
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );
        setUnits(sorted);
      } catch (error) {
        console.error("Failed to load units:", error);
        toast({
          title: "Error",
          description: "Failed to load unit data for proration calculations.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toast]);

  const filteredUnits = useMemo(() => {
    return units.filter(unit => {
      const isAvailable = unit.status === 'available';
      const matchesSearch = 
        unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.size.toLowerCase().includes(searchTerm.toLowerCase());
      return isAvailable && matchesSearch;
    });
  }, [units, searchTerm]);

  const calculateDailyRate = (rent: number) => {
    return rent / daysInCurrentMonth;
  };

  const calculateProratedAmount = (rent: number) => {
    return (rent / daysInCurrentMonth) * remainingDays;
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/units')}
            className="pl-0 hover:bg-transparent"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Units
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Unit Prorates</h2>
          <p className="text-muted-foreground">
            Quick reference for available unit costs and mid-month move-in calculations.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Month</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(today, 'MMMM yyyy')}</div>
            <p className="text-xs text-muted-foreground">
              {daysInCurrentMonth} total days in month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Move-in Today</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(today, 'MMM dd')}</div>
            <p className="text-xs text-muted-foreground">
              {remainingDays} days remaining (including today)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search available units..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Unit Number</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Monthly Rent</TableHead>
              <TableHead className="text-right">Daily Rate</TableHead>
              <TableHead className="text-right bg-muted/50 font-bold">
                Prorated (Today)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading unit data...
                </TableCell>
              </TableRow>
            ) : filteredUnits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No available units found.
                </TableCell>
              </TableRow>
            ) : (
              filteredUnits.map((unit) => {
                const dailyRate = calculateDailyRate(unit.rent);
                const prorated = calculateProratedAmount(unit.rent);

                return (
                  <TableRow key={unit.id}>
                    <TableCell className="font-bold">{unit.name}</TableCell>
                    <TableCell>{unit.size}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className="capitalize"
                      >
                        {unit.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${unit.rent.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ${dailyRate.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-bold bg-muted/30">
                      ${prorated.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="text-xs text-muted-foreground text-center pt-4">
        * Proration calculation formula: (Monthly Rent / {daysInCurrentMonth} days) × {remainingDays} remaining days.
      </div>
    </div>
  );
}