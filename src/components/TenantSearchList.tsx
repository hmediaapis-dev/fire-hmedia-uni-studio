import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type Tenant = {
  id: string;
  name: string;
  nameLower: string;
  email: string;
  phone: string;
  address: string;
  // ... other tenant fields
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ITEMS_PER_PAGE = 20;

export function TenantSearchList() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedLetter, setSelectedLetter] = useState('A');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const router = useRouter();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load tenants when letter or search changes
  useEffect(() => {
    loadTenants(true);
  }, [selectedLetter, debouncedSearch]);

  const loadTenants = async (reset: boolean = false) => {
    // Determine what to search for
    const searchValue = debouncedSearch.trim() || selectedLetter;
    
    if (!searchValue) {
      return;
    }

    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const searchFunction = httpsCallable(functions, 'searchTenantsPaginated');
      const result = await searchFunction({
        searchTerm: searchValue,
        limit: ITEMS_PER_PAGE,
        lastDocId: reset ? null : lastDocId,
      });

      const data = result.data as {
        tenants: Tenant[];
        lastDocId: string | null;
        hasMore: boolean;
        count: number;
      };

      if (reset) {
        setTenants(data.tenants);
      } else {
        setTenants(prev => [...prev, ...data.tenants]);
      }

      setLastDocId(data.lastDocId);
      setHasMore(data.hasMore);
    } catch (error: any) {
      console.error('Error loading tenants:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load tenants.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLetterClick = (letter: string) => {
    setSelectedLetter(letter);
    setSearchTerm(''); // Clear search when clicking letter
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // When user starts typing, clear letter selection
    if (e.target.value.trim()) {
      setSelectedLetter('');
    }
  };

  const handleLoadMore = () => {
    loadTenants(false);
  };

  const activeFilter = debouncedSearch.trim() || selectedLetter;

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Search tenants by name..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-10"
        />
      </div>

      {/* Letter Filter Pills */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(36px,1fr))] gap-2">
        {ALPHABET.map((letter) => (
          <Button
            key={letter}
            variant={selectedLetter === letter && !searchTerm ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleLetterClick(letter)}
            className="w-full"
          >
            {letter}
          </Button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Results Header */}
          {tenants.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} 
              {activeFilter && ` starting with "${activeFilter}"`}
              {hasMore && ' (more available)'}
            </div>
          )}

          {/* Tenant List */}
          <div className="space-y-3">
            {tenants.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No tenants found {activeFilter && `starting with "${activeFilter}"`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              tenants.map((tenant) => (
                <Card key={tenant.id} className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/tenants/${tenant.id}`)}>
                  <CardContent className="py-4">
                    <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
                      <div>
                        <h3 className="font-semibold text-lg">{tenant.name}</h3>
                        <p className="text-sm text-muted-foreground">{tenant.email}</p>
                        <p className="text-sm text-muted-foreground">{tenant.phone}</p>
                      </div>

                      <div className="text-right text-sm text-muted-foreground">
                        {tenant.address}
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
      )}
    </div>
  );
}