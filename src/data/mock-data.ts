import type { Tenant, Unit, Invoice, Document } from '@/types';
import { subMonths, addMonths } from 'date-fns';

const now = new Date();

export const mockTenants: Tenant[] = [
  { id: 't1', name: 'John Doe', email: 'john.doe@example.com', phone: '555-1234', units: ['U101', 'U102'], rent: 1500, balance: 0, notes: 'Good tenant, always pays on time.', joinDate: subMonths(now, 12) },
  { id: 't2', name: 'Jane Smith', email: 'jane.smith@example.com', phone: '555-5678', units: ['U205'], rent: 800, balance: 800, notes: 'Late payment last month.', joinDate: subMonths(now, 6) },
  { id: 't3', name: 'Alice Johnson', email: 'alice.j@example.com', phone: '555-8765', units: ['U301'], rent: 950, balance: 0, notes: '', joinDate: subMonths(now, 2) },
  { id: 't4', name: 'Bob Williams', email: 'bob.w@example.com', phone: '555-4321', units: ['U105'], rent: 750, balance: 0, notes: 'Requested maintenance for a leaky faucet.', joinDate: subMonths(now, 24) },
];

export const mockUnits: Unit[] = [
  { id: 'U101', name: 'Unit 101', size: '10x10', rent: 750, status: 'rented', tenantId: 't1', gateCode: '1234' },
  { id: 'U102', name: 'Unit 102', size: '10x10', rent: 750, status: 'rented', tenantId: 't1', gateCode: '1235' },
  { id: 'U103', name: 'Unit 103', size: '10x15', rent: 900, status: 'available', gateCode: '1236' },
  { id: 'U104', name: 'Unit 104', size: '10x15', rent: 900, status: 'maintenance', gateCode: '1237' },
  { id: 'U105', name: 'Unit 105', size: '10x10', rent: 750, status: 'rented', tenantId: 't4', gateCode: '1238' },
  { id: 'U205', name: 'Unit 205', size: '10x15', rent: 800, status: 'rented', tenantId: 't2', gateCode: '5678' },
  { id: 'U301', name: 'Unit 301', size: '15x20', rent: 950, status: 'rented', tenantId: 't3', gateCode: '8765' },
  { id: 'U302', name: 'Unit 302', size: '15x20', rent: 1100, status: 'available', gateCode: '8766' },
];

export const mockInvoices: Invoice[] = [
  { id: 'inv1', tenantId: 't1', amount: 1500, dueDate: subMonths(now, 1), paidDate: subMonths(now, 1), status: 'paid' },
  { id: 'inv2', tenantId: 't2', amount: 800, dueDate: subMonths(now, 1), paidDate: subMonths(now, 1), status: 'paid' },
  { id: 'inv3', tenantId: 't3', amount: 950, dueDate: subMonths(now, 1), paidDate: subMonths(now, 1), status: 'paid' },
  { id: 'inv4', tenantId: 't2', amount: 800, dueDate: now, status: 'unpaid' },
  { id: 'inv5', tenantId: 't1', amount: 1500, dueDate: now, status: 'unpaid' },
  { id: 'inv6', tenantId: 't4', amount: 750, dueDate: subMonths(now, 2), status: 'void' },
  { id: 'inv7', tenantId: 't3', amount: 950, dueDate: now, status: 'paid', paidDate: now },
];

export const mockDocuments: Document[] = [
    { id: 'doc1', title: 'Lease Agreement - John Doe', description: 'Standard lease agreement for units U101 and U102.', fileType: 'pdf', uploadDate: subMonths(now, 12), url: '#' },
    { id: 'doc2', title: 'Move-in Inspection - Jane Smith', description: 'Checklist for unit U205 upon move-in.', fileType: 'docx', uploadDate: subMonths(now, 6), url: '#' },
    { id: 'doc3', title: 'ID Scan - Alice Johnson', description: 'Driver\'s license scan.', fileType: 'jpg', uploadDate: subMonths(now, 2), url: '#' },
    { id: 'doc4', title: 'Gate Code Instructions', description: 'General instructions for all tenants.', fileType: 'pdf', uploadDate: subMonths(now, 24), url: '#' },
];
