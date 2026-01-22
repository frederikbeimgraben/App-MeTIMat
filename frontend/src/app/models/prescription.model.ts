export interface Prescription {
  // DB specific fields (numeric IDs from backend)
  id: number;
  order_id: number;
  medication_id?: number;
  medication_name?: string;
  pzn?: string;
  fhir_data?: fhir4.MedicationRequest;
  created_at: string;
  updated_at: string;

  // FHIR fields (flattened for frontend template compatibility)
  // We use the types from @types/fhir or define them loosely where necessary
  resourceType?: 'MedicationRequest';
  status?: string;
  intent?: string;
  authoredOn?: string;

  requester?: {
    display?: string;
    reference?: string;
  };

  medicationReference?: {
    reference: string;
    display?: string;
  };

  medicationCodeableConcept?: fhir4.CodeableConcept;

  medication?: {
    concept?: {
      coding?: Array<{ code?: string; display?: string; system?: string }>;
    };
  };

  dosageInstruction?: fhir4.Dosage[];

  dispenseRequest?: {
    validityPeriod?: {
      start?: string;
      end?: string;
    };
    numberOfRepeatsAllowed?: number;
    quantity?: fhir4.Quantity;
    expectedSupplyDuration?: fhir4.Duration;
  };

  // Add any other specific FHIR fields used in templates
  subject?: fhir4.Reference;
  note?: fhir4.Annotation[];
}
