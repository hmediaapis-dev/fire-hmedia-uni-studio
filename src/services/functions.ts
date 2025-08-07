import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';

const generateMonthlyInvoicesNow = httpsCallable(functions, 'generateMonthlyInvoicesNow');

export async function runManualInvoiceGeneration() {
    return await generateMonthlyInvoicesNow();
}
