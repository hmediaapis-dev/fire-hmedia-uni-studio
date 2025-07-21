'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your site configuration and preferences.
        </p>
      </div>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Update your site's contact information and gate codes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-email">Contact Email</Label>
              <Input
                id="contact-email"
                placeholder="contact@example.com"
                defaultValue="support@hmedia.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Contact Phone</Label>
              <Input
                id="contact-phone"
                placeholder="(555) 123-4567"
                defaultValue="(555) 867-5309"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="main-gate-code">Main Gate Code</Label>
              <Input
                id="main-gate-code"
                placeholder="****"
                defaultValue="1984"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Settings</CardTitle>
            <CardDescription>
              Configure automated billing and default rates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="auto-billing" className="text-base">
                  Automated Monthly Billing
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically generate and send invoices to tenants each
                  month.
                </p>
              </div>
              <Switch id="auto-billing" defaultChecked />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-day">Invoice Day of Month</Label>
              <Input
                id="invoice-day"
                type="number"
                min="1"
                max="28"
                defaultValue="1"
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                Day of the month invoices will be generated (1-28).
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Default Unit Rates</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="rate-10x10" className="text-sm font-normal">
                    10x10 Unit
                  </Label>
                  <Input
                    id="rate-10x10"
                    placeholder="$"
                    defaultValue="750.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rate-10x15" className="text-sm font-normal">
                    10x15 Unit
                  </Label>
                  <Input
                    id="rate-10x15"
                    placeholder="$"
                    defaultValue="900.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rate-15x20" className="text-sm font-normal">
                    15x20 Unit
                  </Label>
                  <Input
                    id="rate-15x20"
                    placeholder="$"
                    defaultValue="1100.00"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
