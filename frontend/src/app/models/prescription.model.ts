export interface Prescription extends fhir4.MedicationRequest {
  // We can add any e-Rezept specific extensions here if needed,
  // but for now, we'll just extend the base FHIR MedicationRequest.
}
