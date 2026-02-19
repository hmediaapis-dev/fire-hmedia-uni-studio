import InvoicePageClient from './InvoicePageClient';

export default async function InvoicePage({ 
  params 
}: { 
  params: { id: string } 
}) {
  return <InvoicePageClient id={params.id} />;
}