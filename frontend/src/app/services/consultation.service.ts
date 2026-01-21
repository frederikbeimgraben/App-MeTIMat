import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { delay, map, takeUntil, shareReplay } from 'rxjs/operators';
import {
  Consultation,
  ConsultationStatus,
  VideoCallInfo,
  ConsultationBuilder,
} from '../models/consultation.model';
import {
  Message,
  MessageSender,
  MessageType,
  MessageBuilder,
} from '../models/message/message.model';

@Injectable({
  providedIn: 'root',
})
export class ConsultationService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private mockConsultations: Consultation[] = [
    new ConsultationBuilder()
      .withDoctor('Dr. Sarah Weber', 'Allgemeinmedizin')
      .withStatus(ConsultationStatus.ACTIVE)
      .withMessages([
        new MessageBuilder()
          .withSender(MessageSender.DOCTOR)
          .withContent('Guten Tag! Wie kann ich Ihnen heute helfen?')
          .withTimestamp(new Date('2024-01-22T10:00:00'))
          .build(),
        new MessageBuilder()
          .withSender(MessageSender.PATIENT)
          .withContent('Hallo Dr. Weber, ich habe seit 3 Tagen Kopfschmerzen.')
          .withTimestamp(new Date('2024-01-22T10:02:00'))
          .build(),
        new MessageBuilder()
          .withSender(MessageSender.DOCTOR)
          .withContent(
            'Das tut mir leid zu hören. Können Sie die Schmerzen genauer beschreiben? Sind sie einseitig oder beidseitig?',
          )
          .withTimestamp(new Date('2024-01-22T10:05:00'))
          .build(),
        new MessageBuilder()
          .withSender(MessageSender.PATIENT)
          .withContent('Die Schmerzen sind beidseitig und fühlen sich dumpf an.')
          .withTimestamp(new Date('2024-01-22T10:07:00'))
          .build(),
        new MessageBuilder()
          .withSender(MessageSender.DOCTOR)
          .withContent(
            'Ich empfehle Ihnen Ibuprofen 400mg. Nehmen Sie bei Bedarf bis zu 3x täglich eine Tablette. Sollten die Schmerzen nicht besser werden, melden Sie sich bitte wieder.',
          )
          .withTimestamp(new Date('2024-01-22T10:10:00'))
          .build(),
      ])
      .build(),

    new ConsultationBuilder()
      .withDoctor('Dr. Michael Schmidt', 'Kardiologie')
      .withStatus(ConsultationStatus.SCHEDULED)
      .withScheduledDate(new Date('2024-01-25T14:30:00'))
      .withMessages([
        new MessageBuilder()
          .withSender(MessageSender.SYSTEM)
          .withContent('Videosprechstunde geplant für 25.01.2024 um 14:30 Uhr')
          .withType(MessageType.SYSTEM_NOTIFICATION)
          .withTimestamp(new Date('2024-01-20T09:00:00'))
          .build(),
      ])
      .build(),

    new ConsultationBuilder()
      .withDoctor('Dr. Anna Müller', 'Dermatologie')
      .withStatus(ConsultationStatus.COMPLETED)
      .withMessages([
        new MessageBuilder()
          .withSender(MessageSender.DOCTOR)
          .withContent('Guten Tag! Sie hatten nach einer Hautuntersuchung gefragt.')
          .withTimestamp(new Date('2024-01-18T11:00:00'))
          .build(),
        new MessageBuilder()
          .withSender(MessageSender.PATIENT)
          .withContent('Ja, ich habe einen Ausschlag am Arm bemerkt.')
          .withTimestamp(new Date('2024-01-18T11:02:00'))
          .build(),
        new MessageBuilder()
          .withSender(MessageSender.DOCTOR)
          .withContent(
            'Nach Ihrer Beschreibung könnte es sich um eine allergische Reaktion handeln. Ich verschreibe Ihnen Cetirizin.',
          )
          .withTimestamp(new Date('2024-01-18T11:15:00'))
          .build(),
        new MessageBuilder()
          .withSender(MessageSender.SYSTEM)
          .withContent('Die Konsultation wurde beendet.')
          .withType(MessageType.SYSTEM_NOTIFICATION)
          .withTimestamp(new Date('2024-01-18T11:20:00'))
          .build(),
      ])
      .build(),
  ];

  private consultationsSubject = new BehaviorSubject<Consultation[]>(this.mockConsultations);
  public consultations$ = this.consultationsSubject
    .asObservable()
    .pipe(takeUntil(this.destroy$), shareReplay({ bufferSize: 1, refCount: true }));

  private activeConsultationSubject = new BehaviorSubject<Consultation | null>(null);
  public activeConsultation$ = this.activeConsultationSubject
    .asObservable()
    .pipe(takeUntil(this.destroy$), shareReplay({ bufferSize: 1, refCount: true }));

  private doctorResponseTimeouts = new Map<string, number>();

  ngOnDestroy(): void {
    this.clearDoctorResponseTimeouts();
    this.destroy$.next();
    this.destroy$.complete();
    this.consultationsSubject.complete();
    this.activeConsultationSubject.complete();
  }

  getAllConsultations(): Observable<Consultation[]> {
    return this.consultations$.pipe(delay(300));
  }

  getConsultationById(id: string): Observable<Consultation | undefined> {
    return this.consultations$.pipe(
      delay(100),
      map((consultations) => consultations.find((c) => c.id === id)),
    );
  }

  getActiveConsultations(): Observable<Consultation[]> {
    return this.consultations$.pipe(
      delay(300),
      map((consultations) => consultations.filter((c) => c.status === ConsultationStatus.ACTIVE)),
    );
  }

  getScheduledConsultations(): Observable<Consultation[]> {
    return this.consultations$.pipe(
      delay(300),
      map((consultations) =>
        consultations.filter((c) => c.status === ConsultationStatus.SCHEDULED),
      ),
    );
  }

  startNewConsultation(specialty: string): Observable<Consultation> {
    return new Observable((observer) => {
      setTimeout(() => {
        const doctors = [
          { name: 'Dr. Lisa Wagner', specialty: 'Allgemeinmedizin' },
          { name: 'Dr. Thomas Klein', specialty: 'Innere Medizin' },
          { name: 'Dr. Julia Becker', specialty: 'Gynäkologie' },
          { name: 'Dr. Martin Schulz', specialty: 'Orthopädie' },
        ];

        const doctor = doctors.find((d) => d.specialty === specialty) || doctors[0];

        const newConsultation = new ConsultationBuilder()
          .withDoctor(doctor.name, doctor.specialty)
          .withStatus(ConsultationStatus.ACTIVE)
          .withMessages([
            new MessageBuilder()
              .withSender(MessageSender.SYSTEM)
              .withContent(`Sie sind jetzt mit ${doctor.name} verbunden.`)
              .withType(MessageType.SYSTEM_NOTIFICATION)
              .build(),
            new MessageBuilder()
              .withSender(MessageSender.DOCTOR)
              .withContent('Guten Tag! Wie kann ich Ihnen helfen?')
              .withTimestamp(new Date(Date.now() + 1000))
              .build(),
          ])
          .build();

        this.mockConsultations.unshift(newConsultation);
        this.consultationsSubject.next([...this.mockConsultations]);
        this.activeConsultationSubject.next(newConsultation);

        observer.next(newConsultation);
        observer.complete();
      }, 1000);
    });
  }

  sendMessage(consultationId: string, content: string): Observable<Message> {
    return new Observable((observer) => {
      const consultation = this.mockConsultations.find((c) => c.id === consultationId);

      if (consultation && consultation.status === ConsultationStatus.ACTIVE) {
        const newMessage = new MessageBuilder()
          .withSender(MessageSender.PATIENT)
          .withContent(content)
          .build();

        // Add message to consultation
        consultation.messages.push(newMessage);
        consultation.updatedAt = new Date();

        // Create a deep copy to ensure change detection works properly
        const updatedConsultations = this.mockConsultations.map((c) =>
          c.id === consultationId ? { ...c, messages: [...c.messages], updatedAt: new Date() } : c,
        );

        this.consultationsSubject.next(updatedConsultations);
        this.mockConsultations = updatedConsultations;

        // Clear any existing timeout for this consultation
        const existingTimeout = this.doctorResponseTimeouts.get(consultationId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Simulate doctor response after 3-5 seconds
        const timeoutId = window.setTimeout(
          () => {
            this.simulateDoctorResponse(consultationId);
            this.doctorResponseTimeouts.delete(consultationId);
          },
          3000 + Math.random() * 2000,
        );

        this.doctorResponseTimeouts.set(consultationId, timeoutId);

        observer.next(newMessage);
      } else {
        observer.error(new Error('Consultation not active'));
      }
      observer.complete();
    });
  }

  private clearDoctorResponseTimeouts(): void {
    this.doctorResponseTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.doctorResponseTimeouts.clear();
  }

  private simulateDoctorResponse(consultationId: string): void {
    const consultation = this.mockConsultations.find((c) => c.id === consultationId);

    if (consultation && consultation.status === ConsultationStatus.ACTIVE) {
      const responses = [
        'Verstehe. Können Sie mir noch mehr Details dazu geben?',
        'Das ist ein wichtiger Hinweis. Wie lange haben Sie diese Symptome schon?',
        'Ich empfehle Ihnen, die verschriebenen Medikamente wie besprochen einzunehmen.',
        'Haben Sie noch weitere Fragen oder Bedenken?',
        'Basierend auf Ihren Symptomen würde ich folgendes empfehlen...',
        'Das klingt nach einer typischen Reaktion. Beobachten Sie es weiter.',
        'Sollten sich die Symptome verschlimmern, kontaktieren Sie mich bitte sofort.',
      ];

      const doctorMessage = new MessageBuilder()
        .withSender(MessageSender.DOCTOR)
        .withContent(responses[Math.floor(Math.random() * responses.length)])
        .build();

      // Add doctor message
      consultation.messages.push(doctorMessage);
      consultation.updatedAt = new Date();

      // Create a deep copy to ensure change detection works properly
      const updatedConsultations = this.mockConsultations.map((c) =>
        c.id === consultationId ? { ...c, messages: [...c.messages], updatedAt: new Date() } : c,
      );

      this.consultationsSubject.next(updatedConsultations);
      this.mockConsultations = updatedConsultations;
    }
  }

  scheduleVideoCall(consultationId: string, scheduledTime: Date): Observable<VideoCallInfo> {
    return new Observable((observer) => {
      setTimeout(() => {
        const consultation = this.mockConsultations.find((c) => c.id === consultationId);

        if (consultation) {
          consultation.scheduledDate = scheduledTime;
          consultation.status = ConsultationStatus.SCHEDULED;
          consultation.updatedAt = new Date();

          const systemMessage = new MessageBuilder()
            .withSender(MessageSender.SYSTEM)
            .withContent(`Videosprechstunde geplant für ${scheduledTime.toLocaleString('de-DE')}`)
            .withType(MessageType.VIDEO_CALL_REQUEST)
            .build();

          consultation.messages.push(systemMessage);

          // Create a deep copy to ensure change detection works properly
          const updatedConsultations = this.mockConsultations.map((c) =>
            c.id === consultationId
              ? { ...c, messages: [...c.messages], updatedAt: new Date() }
              : c,
          );

          this.consultationsSubject.next(updatedConsultations);
          this.mockConsultations = updatedConsultations;

          const videoCallInfo: VideoCallInfo = {
            consultationId: consultationId,
            scheduledTime: scheduledTime,
            meetingUrl: `https://meet.metimat.de/consultation/${consultationId}`,
            accessCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
          };

          observer.next(videoCallInfo);
        } else {
          observer.error(new Error('Consultation not found'));
        }
        observer.complete();
      }, 500);
    });
  }

  markMessagesAsRead(consultationId: string): void {
    // This method is kept for compatibility but doesn't do anything
    // since we removed the read status feature
    console.log(`Messages marked as read for consultation ${consultationId}`);
  }

  endConsultation(consultationId: string): Observable<boolean> {
    return new Observable((observer) => {
      // Clear any pending doctor response timeout
      const timeoutId = this.doctorResponseTimeouts.get(consultationId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.doctorResponseTimeouts.delete(consultationId);
      }

      const consultation = this.mockConsultations.find((c) => c.id === consultationId);

      if (consultation) {
        consultation.status = ConsultationStatus.COMPLETED;
        consultation.updatedAt = new Date();

        const systemMessage = new MessageBuilder()
          .withSender(MessageSender.SYSTEM)
          .withContent('Die Konsultation wurde beendet.')
          .withType(MessageType.SYSTEM_NOTIFICATION)
          .build();

        consultation.messages.push(systemMessage);

        // Create a deep copy to ensure change detection works properly
        const updatedConsultations = this.mockConsultations.map((c) =>
          c.id === consultationId ? { ...c, messages: [...c.messages], updatedAt: new Date() } : c,
        );

        this.consultationsSubject.next(updatedConsultations);
        this.mockConsultations = updatedConsultations;
        this.activeConsultationSubject.next(null);

        observer.next(true);
      } else {
        observer.next(false);
      }
      observer.complete();
    });
  }

  getUnreadMessageCount(): Observable<number> {
    // Since we removed the read status, always return 0
    return new Observable((observer) => {
      observer.next(0);
      observer.complete();
    });
  }

  uploadFile(consultationId: string, file: File): Observable<Message> {
    return new Observable((observer) => {
      // Simulate file upload
      setTimeout(() => {
        const consultation = this.mockConsultations.find((c) => c.id === consultationId);

        if (consultation && consultation.status === ConsultationStatus.ACTIVE) {
          const fileMessage = new MessageBuilder()
            .withSender(MessageSender.PATIENT)
            .withContent(file.name)
            .withType(MessageType.FILE)
            .withMetadata({
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
            })
            .build();

          consultation.messages.push(fileMessage);
          consultation.updatedAt = new Date();

          const updatedConsultations = this.mockConsultations.map((c) =>
            c.id === consultationId
              ? { ...c, messages: [...c.messages], updatedAt: new Date() }
              : c,
          );

          this.consultationsSubject.next(updatedConsultations);
          this.mockConsultations = updatedConsultations;

          observer.next(fileMessage);
        } else {
          observer.error(new Error('Consultation not active'));
        }
        observer.complete();
      }, 1500);
    });
  }
}
