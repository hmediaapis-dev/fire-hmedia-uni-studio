'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/date-range-picker';
import { FileText } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import type { Tenant } from '@/types';

export function TenantReportSelector({ tenants }: { tenants: Tenant[] }) {
  const router = useRouter();
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const handleGenerateReport = () => {
    if (!selectedTenantId) {
      alert('Please select a tenant');
      return;
    }

    let url = `/reports/${selectedTenantId}`;
    
    // Add date range as query params if selected
    if (dateRange?.from && dateRange?.to) {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      });
      url += `?${params.toString()}`;
    }

    router.push(url);
  };

  return (
    <Card className="max-w-2xl px-10">
      <CardHeader>
        <CardTitle>Generate Tenant Report</CardTitle>
        <CardDescription>
          Select a tenant and optional date range to generate a financial report
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="tenant">Tenant</Label>
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger id="tenant">
              <SelectValue placeholder="Select a tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name} {tenant.email && `(${tenant.email})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Date Range (Optional)</Label>
          <DateRangePicker onSelect={setDateRange} />
          <p className="text-sm text-muted-foreground">
            Leave empty to include all transactions
          </p>
        </div>

        <Button 
          onClick={handleGenerateReport} 
          className="w-full gap-2"
          disabled={!selectedTenantId}
        >
          <FileText className="w-4 h-4" />
          Generate Report
        </Button>
      </CardContent>
    </Card>
  );
}