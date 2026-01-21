import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { ConsultationService } from '../../services/consultation.service';
import { Consultation, ConsultationStatus } from '../../models/consultation.model';
import { MessageSender } from '../../models/message/message.model';
import { HeaderCommonComponent } from '../shared/header-common.component';

@Component({
  selector: 'app-consultations',
  standalone: true,
  imports: [CommonModule, TranslocoModule, MatIconModule, HeaderCommonComponent],
  templateUrl: './consultations.component.html',
  styleUrls: ['./consultations.component.css'],
})
export class ConsultationsComponent implements OnInit {
  consultations: Consultation[] = [];
  activeConsultations: Consultation[] = [];
  scheduledConsultations: Consultation[] = [];
  completedConsultations: Consultation[] = [];
  loading = true;
  showSpecialtySelection = false;

  specialties = [
    'Allgemeinmedizin',
    'Innere Medizin',
    'Kardiologie',
    'Dermatologie',
    'Gynäkologie',
    'Orthopädie',
    'Neurologie',
    'Psychiatrie',
  ];

  constructor(
    private router: Router,
    private consultationService: ConsultationService,
  ) {}

  ngOnInit(): void {
    this.loadConsultations();
  }

  loadConsultations(): void {
    this.loading = true;
    this.consultationService.getAllConsultations().subscribe({
      next: (consultations) => {
        this.consultations = consultations;
        this.activeConsultations = consultations.filter(
          (c) => c.status === ConsultationStatus.ACTIVE,
        );
        this.scheduledConsultations = consultations.filter(
          (c) => c.status === ConsultationStatus.SCHEDULED,
        );
        this.completedConsultations = consultations.filter(
          (c) => c.status === ConsultationStatus.COMPLETED,
        );
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading consultations:', error);
        this.loading = false;
      },
    });
  }

  startNewConsultation(): void {
    this.showSpecialtySelection = true;
  }

  selectSpecialty(specialty: string): void {
    this.showSpecialtySelection = false;
    this.consultationService.startNewConsultation(specialty).subscribe({
      next: (consultation) => {
        this.router.navigate(['/consultation', consultation.id]);
      },
      error: (error) => {
        console.error('Error starting consultation:', error);
      },
    });
  }

  openChat(consultationId: string): void {
    this.router.navigate(['/consultation', consultationId]);
  }

  viewConsultation(consultationId: string): void {
    this.router.navigate(['/consultation', consultationId]);
  }

  joinVideoCall(event: Event, consultation: Consultation): void {
    event.stopPropagation();
    // TODO: Implement video call functionality
    console.log('Joining video call for consultation', consultation.id);
  }

  isCallReady(consultation: Consultation): boolean {
    if (!consultation.scheduledDate) return false;
    const now = new Date();
    const scheduledTime = new Date(consultation.scheduledDate);
    const timeDiff = scheduledTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    return minutesDiff <= 5 && minutesDiff >= -30; // Show join button 5 minutes before to 30 minutes after scheduled time
  }
}
