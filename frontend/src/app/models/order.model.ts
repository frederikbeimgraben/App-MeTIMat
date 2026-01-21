export interface Order extends fhir4.ServiceRequest {
  // We can add any specific extensions here if needed,
  // but for now, we'll just extend the base FHIR ServiceRequest.
  // Properties like orderNumber, totalAmount, pickupLocation, pickupCode
  // might be handled via extensions or a custom profile.
}

export interface OrderItem {
  medicationId: string;
  medicationName: string;
  quantity: number;
  price: number;
  prescriptionId?: string;
}

export interface PickupLocation {
  id: string;
  name: string;
  address: string;
  phone: string;
  openingHours: string;
  available: boolean;
}
