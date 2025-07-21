'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartContainer,
} from '@/components/ui/chart';
import { format, subMonths } from 'date-fns';

const data = [
  { date: subMonths(new Date(), 5), revenue: 5240 },
  { date: subMonths(new Date(), 4), revenue: 6340 },
  { date: subMonths(new Date(), 3), revenue: 7102 },
  { date: subMonths(new Date(), 2), revenue: 5890 },
  { date: subMonths(new Date(), 1), revenue: 7800 },
  { date: new Date(), revenue: 8250 },
];

export function DashboardChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <ChartContainer
        config={{
          revenue: {
            label: 'Revenue',
            color: 'hsl(var(--primary))',
          },
        }}
      >
        <BarChart data={data}>
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => format(value, 'MMM')}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value / 1000}K`}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
        </BarChart>
      </ChartContainer>
    </ResponsiveContainer>
  );
}
