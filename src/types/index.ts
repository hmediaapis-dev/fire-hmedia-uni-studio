

export type Tenant = {
  id: string;
  name: string;
  nameLower: string;
  email: string;
  phone: string;
  address: string;
  units: string[];
  rent: number;
  balance: number;
  notes: string;
  joinDate: Date;
};

export type Unit = {
  id: string;
  name: string;
  size: string;
  rent: number;
  status: 'available' | 'rented' | 'maintenance';
  tenantId?: string;
  gateCode: string;
  startDate?: Date; // Date the unit was assigned to a tenant
};

export type Invoice = {
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
};

export type Payment = {
  id: string;
  tenantId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'Cash' | 'Check' | 'Credit Card' | 'Other';
  invoiceIds: string[];
  transactionId?: string;
  notes?: string;
  status: 'complete' | 'void'; // New status field
  voidedDate?: Date; // Optional field to track when payment was voided
  voidedBy?: string; // Optional field to track who voided the payment
};


export type Document = {
  id: string;
  title: string;
  description: string;
  fileType: 'pdf' | 'docx' | 'png' | 'jpg' | string; // Allow for more file types
  uploadDate: Date;
  url: string;
  storagePath: string; // Path to the file in Firebase Storage
};

export type Settings = {
  id: 'main';
  contactEmail: string;
  contactPhone: string;
  mainGateCode: string;
  autoBilling: boolean;
  invoiceDay: number;
  currentInvoiceNum: number; // Add this line
  defaultRates: {
    [key: string]: number;
  };
};
