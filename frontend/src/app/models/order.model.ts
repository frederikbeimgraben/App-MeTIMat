export type OrderStatus =
  | 'pending'
  | 'available for pickup'
  | 'completed'
  | 'cancelled'
  | 'active'
  | 'draft'
  | 'on-hold';

export interface Order {
  id: any;
  user_id?: number;
  status: OrderStatus;
  access_token?: string;
  total_price?: number;
  created_at: string;
  updated_at?: string;
  prescriptions?: any[];
  medications?: any[];
  location_id?: number;
  location?: any;

  // Compatibility fields for the UI/FHIR transition
  authoredOn?: string;
  meta?: { lastUpdated?: string };
  extension?: any[];
  identifier?: { value: string }[];
  locationReference?: { display: string; reference: string }[];
}

export interface OrderItem {
  medicationId: string;
  medicationName: string;
  quantity: number;
  price: number;
  prescriptionId?: string | number;
}

export interface PickupLocation {
  id: string;
  name: string;
  address: string;
  phone: string;
  openingHours: string;
  available: boolean;
}
