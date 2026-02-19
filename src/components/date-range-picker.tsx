
'use client';

import * as React from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DateRangePickerProps {
  className?: string;
  onSelect: (range: DateRange | undefined) => void;
}

export function DateRangePicker({ className, onSelect }: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    onSelect(date);
  }, [date, onSelect]);

  const handlePresetSelect = (preset: string) => {
    const now = new Date();
    switch (preset) {
        case 'this-month':
            setDate({ from: startOfMonth(now), to: endOfMonth(now) });
            break;
        case 'last-month':
            const lastMonth = subMonths(now, 1);
            setDate({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
            break;
        case 'last-30-days':
            setDate({ from: subDays(now, 29), to: now });
            break;
        default:
            setDate(undefined);
    }
    setIsOpen(false);
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[260px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} -{' '}
                  {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex">
            <div className="p-2 border-r">
                <Select onValueChange={handlePresetSelect}>
                    <SelectTrigger>
                        <SelectValue placeholder="Presets" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                        <SelectItem value="this-month">This month</SelectItem>
                        <SelectItem value="last-month">Last month</SelectItem>
                        <SelectItem value="last-30-days">Last 30 days</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
            />
          </div>
          <div className="flex justify-end p-2 border-t">
              <Button variant="ghost" onClick={() => setDate(undefined)}>Clear</Button>
              <Button onClick={() => setIsOpen(false)}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
