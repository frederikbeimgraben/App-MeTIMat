/// <reference types="fhir" />

export interface VendingMachine extends fhir4.Location {
  // Extended properties for frontend display logic
  distance?: number; // Distance in km from user/center
  location?: string; // Formatted address string for display
}

export interface VendingMachineFilter {
  maxDistance?: number;
  status?: 'active' | 'suspended' | 'inactive' | 'maintenance' | 'offline'; // Extended to include frontend custom statuses if needed
  paymentMethod?: 'card' | 'cash' | 'nfc';
}

export interface MedicationAvailability {
  medicationId: string;
  machineId: string;
  available: boolean;
  quantity?: number;
  lastChecked?: Date;
}
