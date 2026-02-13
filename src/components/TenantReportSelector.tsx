'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/date-range-picker';
import { FileText } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

type Props = {
  tenantId: string;
};

export function TenantReportSelector({ tenantId }: Props) {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const handleGenerateReport = () => {
    if (!tenantId) {
      console.error("TenantReportSelector: tenantId is undefined");
      return;
    }

    let url = `/reports/${tenantId}`;

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
          Select a date range to generate a financial report
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Date Range <span className="text-destructive">*</span></Label>
          <DateRangePicker onSelect={setDateRange} />
          <p className="text-sm text-muted-foreground">
            Select a start and end date to generate the report
          </p>
        </div>

        <Button
          onClick={handleGenerateReport}
          disabled={!dateRange?.from || !dateRange?.to}
          className="w-full gap-2"
        >
          <FileText className="w-4 h-4" />
          Generate Report
        </Button>
      </CardContent>
    </Card>
  );
}