import { Message } from './message/message.model';

export interface Consultation {
  id: string;
  doctorName: string;
  specialty: string;
  status: ConsultationStatus;
  scheduledDate?: Date;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export enum ConsultationStatus {
  ACTIVE = 'active',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface VideoCallInfo {
  consultationId: string;
  scheduledTime: Date;
  meetingUrl: string;
  accessCode?: string;
  duration?: number;
}

export interface ConsultationSummary {
  consultationId: string;
  diagnosis?: string;
  prescriptions?: string[];
  recommendations?: string[];
  followUpDate?: Date;
  notes?: string;
}

export class ConsultationBuilder {
  private consultation: Partial<Consultation> = {
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  constructor() {
    this.consultation.id = this.generateId();
  }

  private generateId(): string {
    return `consultation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  withDoctor(name: string, specialty: string): ConsultationBuilder {
    this.consultation.doctorName = name;
    this.consultation.specialty = specialty;
    return this;
  }

  withStatus(status: ConsultationStatus): ConsultationBuilder {
    this.consultation.status = status;
    return this;
  }

  withScheduledDate(date: Date): ConsultationBuilder {
    this.consultation.scheduledDate = date;
    return this;
  }

  withMessages(messages: Message[]): ConsultationBuilder {
    this.consultation.messages = messages;
    return this;
  }

  build(): Consultation {
    if (!this.consultation.doctorName || !this.consultation.specialty) {
      throw new Error('Doctor name and specialty are required');
    }
    if (!this.consultation.status) {
      throw new Error('Consultation status is required');
    }
    return this.consultation as Consultation;
  }
}
