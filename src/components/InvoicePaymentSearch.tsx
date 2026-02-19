'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

type Invoice = {
  id: string;
  invoiceNumber: number;
  monthRange: string;
  tenantId: string;
  unitId?: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: 'paid' | 'unpaid' | 'void' | 'partially-paid';
  createdAt?: Date;
  amountPaid?: number;
  notes: string;
  // Populated tenant data
  tenantName?: string;
  tenantEmail?: string;
};

const ITEMS_PER_PAGE = 20;

export function InvoicePaymentSearch() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (reset: boolean = true) => {
    const trimmedSearch = searchTerm.trim();
    
    if (!trimmedSearch) {
      toast({
        title: 'Validation Error',
        description: 'Please enter an invoice number to search.',
        variant: 'destructive',
      });
      return;
    }

    if (reset) {
      setIsLoading(true);
      setHasSearched(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const searchFunction = httpsCallable(functions, 'searchInvoicesPaginated');
      const result = await searchFunction({
        searchTerm: trimmedSearch,
        limit: ITEMS_PER_PAGE,
        lastDocId: reset ? null : lastDocId,
      });

      const data = result.data as {
        invoices: Invoice[];
        lastDocId: string | null;
        hasMore: boolean;
        count: number;
      };

      // Convert date strings back to Date objects
      const processedInvoices = data.invoices.map(inv => ({
        ...inv,
        dueDate: inv.dueDate ? new Date(inv.dueDate) : new Date(),
        paidDate: inv.paidDate ? new Date(inv.paidDate) : undefined,
        createdAt: inv.createdAt ? new Date(inv.createdAt) : undefined,
      }));

      if (reset) {
        setInvoices(processedInvoices);
      } else {
        setInvoices(prev => [...prev, ...processedInvoices]);
      }

      setLastDocId(data.lastDocId);
      setHasMore(data.hasMore);
    } catch (error: any) {
      console.error('Error searching invoices:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to search invoices.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(true);
    }
  };

  const handleLoadMore = () => {
    handleSearch(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'unpaid':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'partially-paid':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'void':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by invoice number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>
        <Button onClick={() => handleSearch(true)} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Search
            </>
          )}
        </Button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : hasSearched ? (
        <>
          {/* Results Header */}
          {invoices.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
              {hasMore && ' (more available)'}
            </div>
          )}

          {/* Invoice List */}
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No invoices found matching "{searchTerm}"
                  </p>
                </CardContent>
              </Card>
            ) : (
              invoices.map((invoice) => (
                <Card
                  key={invoice.id}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/invoices/${invoice.id}/payments`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-mono text-lg font-bold">
                            #{invoice.invoiceNumber}
                          </h3>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm">
                            <span className="font-medium">Tenant:</span>{' '}
                            {invoice.tenantName || 'Unknown'}
                          </p>
                          {invoice.tenantEmail && (
                            <p className="text-sm text-muted-foreground">
                              {invoice.tenantEmail}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Period: {invoice.monthRange}
                          </p>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <p className="text-2xl font-bold">
                          ${invoice.amount.toFixed(2)}
                        </p>
                        {invoice.amountPaid && invoice.amountPaid > 0 && (
                          <p className="text-sm text-muted-foreground">
                            Paid: ${invoice.amountPaid.toFixed(2)}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Due: {format(invoice.dueDate, 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                variant="outline"
                size="lg"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Enter an invoice number and click Search to find invoices
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}