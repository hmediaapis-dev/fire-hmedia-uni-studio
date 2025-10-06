
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '@/services/settings';                        //Services for getting and updating settings
import type { Settings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { runManualInvoiceGeneration, setAdminClaim } from '@/services/functions';
import { useAuth } from '@/context/auth-context';


const defaultSettings: Settings = {
  id: 'main',
  contactEmail: '',
  contactPhone: '',
  mainGateCode: '',
  autoBilling: true,
  currentInvoiceNum: 100,
  invoiceDay: 1,
  defaultRates: {
    '10x10': 0,
    '10x15': 0,
    '15x20': 0,
  }
};


export default function SettingsPage() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClaimingAdmin, setIsClaimingAdmin] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');


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

  useEffect(() => {
    async function checkAdminStatus() {
        const idTokenResult = await user?.getIdTokenResult();
        setIsAdmin(idTokenResult?.claims.admin === true);
    }
    if(user) {
        checkAdminStatus();
    }
  }, [user]);

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
      setIsConfirmOpen(false); // Close dialog after completion
    }
  };
  
  const handleMakeAdmin = async (email: string | null | undefined) => {
    if(!email) {
        toast({ title: "Error", description: "No email provided.", variant: "destructive"});
        return;
    }
    if (!confirm(`Are you sure you want to grant admin privileges to ${email}?`)) {
        return;
    }
    setIsClaimingAdmin(true);
    try {
        const result: any = await setAdminClaim({ email });
        toast({ title: "Success", description: result.data.message });
        // Force refresh of the token to get the new claim
        await user?.getIdToken(true);
        // Re-check admin status
        const idTokenResult = await user?.getIdTokenResult(true);
        setIsAdmin(idTokenResult?.claims.admin === true);
    } catch(error: any) {
        console.error("Failed to set admin claim:", error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setIsClaimingAdmin(false);
    }
  }

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
            <div className="space-y-2">
              <Label htmlFor="invoiceNum">Current Invoice Number</Label>
              <Input
              id="invoiceNum"
              type="number"
              value={settings.currentInvoiceNum}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                currentInvoiceNum: parseInt(e.target.value, 10) || 100 // Fixed: update currentInvoiceNum
              }))}
              className="w-24"
            />
              <p className="text-xs text-muted-foreground">
                Change this only if invoice numbers are off and a reset is in order.
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
              <Button 
                onClick={() => setIsConfirmOpen(true)} 
                disabled={isGenerating || !isAdmin}
              >
                {isGenerating ? "Generating..." : "Run Invoices Now"}
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
                <CardDescription>
                    Manage user roles and administrative privileges.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isAdmin ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600">
                            <ShieldCheck className="h-5 w-5" />
                            <p className="font-medium">You have administrative privileges.</p>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="new-admin-email">Grant Admin to User</Label>
                            <div className="flex gap-2">
                                <Input 
                                    id="new-admin-email" 
                                    type="email" 
                                    placeholder="user@example.com" 
                                    value={newAdminEmail}
                                    onChange={(e) => setNewAdminEmail(e.target.value)}
                                />
                                <Button onClick={() => handleMakeAdmin(newAdminEmail)} disabled={isClaimingAdmin || !newAdminEmail}>
                                    {isClaimingAdmin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Grant Admin
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>No Admin Privileges</AlertTitle>
                            <AlertDescription>
                                Your account does not have administrative rights. You cannot run protected actions.
                            </AlertDescription>
                        </Alert>
                         <Button onClick={() => handleMakeAdmin(user?.email)} disabled={isClaimingAdmin}>
                            {isClaimingAdmin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Become First Admin
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            Click this to grant your account administrative privileges. This can only be done if no other admins exist.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Invoices Now?</AlertDialogTitle>
            <AlertDialogDescription>
              This will run the monthly invoice generation process immediately. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRunInvoicesNow}>
              Generate Invoices
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>

    
  );
}
