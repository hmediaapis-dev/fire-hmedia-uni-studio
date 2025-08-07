'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '@/services/settings';
import type { Settings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { runManualInvoiceGeneration } from '@/services/functions';


const defaultSettings: Settings = {
  id: 'main',
  contactEmail: '',
  contactPhone: '',
  mainGateCode: '',
  autoBilling: true,
  invoiceDay: 1,
  defaultRates: {
    '10x10': 0,
    '10x15': 0,
    '15x20': 0,
  }
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true);
        const savedSettings = await getSettings();
        if (savedSettings) {
          setSettings(savedSettings);
        }
      } catch (error) {
        console.error("Failed to load settings", error);
        toast({
          title: "Error",
          description: "Could not load settings from the database.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setSettings(prev => ({ ...prev, [id]: value }));
  };
  
  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const rateKey = id.replace('rate-', '');
    setSettings(prev => ({
        ...prev,
        defaultRates: {
            ...prev.defaultRates,
            [rateKey]: parseFloat(value) || 0,
        }
    }))
  };

  const handleSwitchChange = (checked: boolean) => {
    setSettings(prev => ({ ...prev, autoBilling: checked }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        await updateSettings(settings);
        toast({
            title: "Success",
            description: "Settings saved successfully."
        });
    } catch (error) {
        console.error("Failed to save settings", error);
        toast({
            title: "Error",
            description: "Could not save settings.",
            variant: "destructive"
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleRunInvoicesNow = async () => {
    if (!confirm("Are you sure you want to run the monthly invoice generation process now? This can't be undone.")) {
        return;
    }
    setIsGenerating(true);
    try {
        const result: any = await runManualInvoiceGeneration();
        toast({
            title: "Invoices Generated",
            description: `${result.data.invoicesCreated} new invoices were created.`,
        });
    } catch(error: any) {
        console.error("Failed to run manual invoice generation:", error);
        toast({
            title: "Error",
            description: error.message || "An unexpected error occurred. Check the console for details.",
            variant: "destructive",
        });
    } finally {
        setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
             <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
        </div>
    );
  }

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
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                placeholder="contact@example.com"
                value={settings.contactEmail}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                placeholder="(555) 123-4567"
                value={settings.contactPhone}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mainGateCode">Main Gate Code</Label>
              <Input
                id="mainGateCode"
                placeholder="****"
                value={settings.mainGateCode}
                onChange={handleInputChange}
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
                <Label htmlFor="autoBilling" className="text-base">
                  Automated Monthly Billing
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically generate and send invoices to tenants each
                  month. Scheduled for 5am CST on the 1st.
                </p>
              </div>
              <Switch 
                id="autoBilling" 
                checked={settings.autoBilling} 
                onCheckedChange={handleSwitchChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceDay">Invoice Day of Month</Label>
              <Input
                id="invoiceDay"
                type="number"
                min="1"
                max="28"
                value={settings.invoiceDay}
                onChange={(e) => setSettings(prev => ({ ...prev, invoiceDay: parseInt(e.target.value, 10) || 1}))}
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
                    type="number"
                    value={settings.defaultRates['10x10']}
                    onChange={handleRateChange}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rate-10x15" className="text-sm font-normal">
                    10x15 Unit
                  </Label>
                  <Input
                    id="rate-10x15"
                    placeholder="$"
                    type="number"
                    value={settings.defaultRates['10x15']}
                    onChange={handleRateChange}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rate-15x20" className="text-sm font-normal">
                    15x20 Unit
                  </Label>
                  <Input
                    id="rate-15x20"
                    placeholder="$"
                    type="number"
                    value={settings.defaultRates['15x20']}
                    onChange={handleRateChange}
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <div className="flex justify-between items-center w-full">
              <p className="text-sm text-muted-foreground">
                Manually trigger this month's invoice generation.
              </p>
              <Button onClick={handleRunInvoicesNow} variant="secondary" disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isGenerating ? 'Generating...' : 'Run Now'}
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Admin Account Required</AlertTitle>
          <AlertDescription>
            To use the "Run Now" invoice generation feature, you must be logged in with an account that has an `admin: true` custom claim. Without this, the function call will be rejected for security reasons.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
