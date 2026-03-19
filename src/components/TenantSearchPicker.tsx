'use client';

import { useState, useEffect, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tenant = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

interface TenantSearchPickerProps {
  excludeTenantId?: string | null;
  onSelect: (tenant: Tenant) => void;
  selectedTenantId?: string;
}

const ITEMS_PER_PAGE = 10;

export function TenantSearchPicker({
  excludeTenantId,
  onSelect,
  selectedTenantId,
}: TenantSearchPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [results, setResults] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Search when debounced value changes
  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    runSearch(trimmed);
  }, [debouncedSearch]);

  const runSearch = async (term: string) => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const searchFunction = httpsCallable(functions, 'searchTenantsPaginated');
      const result = await searchFunction({
        searchTerm: term,
        limit: ITEMS_PER_PAGE,
        lastDocId: null,
      });

      const data = result.data as {
        tenants: Tenant[];
        lastDocId: string | null;
        hasMore: boolean;
        count: number;
      };

      setResults(
        excludeTenantId
          ? data.tenants.filter((t) => t.id !== excludeTenantId)
          : data.tenants
      );
    } catch (error) {
      console.error('Tenant search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-9"
          autoFocus
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="max-h-56 overflow-y-auto rounded-md border bg-background">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !hasSearched ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Start typing to search tenants
          </p>
        ) : results.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No tenants found
          </p>
        ) : (
          <ul className="divide-y">
            {results.map((tenant) => (
              <li
                key={tenant.id}
                onClick={() => onSelect(tenant)}
                className={cn(
                  'flex flex-col gap-0.5 px-3 py-2 cursor-pointer hover:bg-muted/60 transition-colors',
                  selectedTenantId === tenant.id && 'bg-primary/10 hover:bg-primary/15'
                )}
              >
                <span className="text-sm font-medium leading-tight">{tenant.name}</span>
                <span className="text-xs text-muted-foreground">{tenant.email}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}