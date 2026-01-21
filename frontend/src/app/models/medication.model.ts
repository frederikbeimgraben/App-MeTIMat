export interface Medication extends fhir4.Medication {
  // We can add any specific extensions here if needed,
  // but for now, we'll just extend the base FHIR Medication.
  // Existing properties like pzn, price, available might be handled via extensions or a custom profile.
  // For simplicity, we'll assume they will be part of a custom profile or extension if needed.
}

export interface CartItem {
  medication: Medication;
  quantity: number;
  prescriptionId?: string;
}
