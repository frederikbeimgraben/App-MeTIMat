export interface User extends fhir4.Person {
  // We can add any specific extensions here for eGKNumber or other app-specific fields,
  // but for now, we'll just extend the base FHIR Patient.
}

export interface UserSession {
  user: User;
  token: string;
}
