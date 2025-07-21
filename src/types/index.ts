export type Tenant = {
  id: string;
  name: string;
  email: string;
  phone: string;
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
};

export type Invoice = {
  id: string;
  tenantId: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: 'paid' | 'unpaid' | 'void';
};

export type Document = {
  id: string;
  title: string;
  description: string;
  fileType: 'pdf' | 'docx' | 'png' | 'jpg';
  uploadDate: Date;
  url: string;
};
