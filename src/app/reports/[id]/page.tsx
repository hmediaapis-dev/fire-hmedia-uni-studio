import ReportPageClient from './ReportPageClient';

export default async function ReportPage({ 
  params,
  searchParams
}: { 
  params: { id: string };
  searchParams: { from?: string; to?: string };
}) {
  return (
    <ReportPageClient 
      tenantId={params.id}
      dateFrom={searchParams.from}
      dateTo={searchParams.to}
    />
  );
}