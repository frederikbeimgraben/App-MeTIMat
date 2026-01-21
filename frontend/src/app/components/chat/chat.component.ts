import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { ConsultationService } from '../../services/consultation.service';
import { Consultation, ConsultationStatus } from '../../models/consultation.model';
import { Message, MessageSender } from '../../models/message/message.model';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, MatIconModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  consultation: Consultation | null = null;
  newMessage = '';
  loading = true;
  isTyping = false;
  showEndConfirmation = false;

  private destroy$ = new Subject<void>();
  private typingTimeout?: number;
  private lastMessageCount = 0;
  private consultationId?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private consultationService: ConsultationService,
    private location: Location,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.consultationId = this.route.snapshot.paramMap.get('id') || undefined;
    if (this.consultationId) {
      this.subscribeToConsultation(this.consultationId);
    }
  }

  ngOnDestroy(): void {
    // Clear any pending timers
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Complete the destroy subject to unsubscribe from all observables
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToConsultation(consultationId: string): void {
    this.loading = true;

    // Subscribe to consultation updates
    this.consultationService
      .getConsultationById(consultationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (consultation) => {
          const previousMessageCount = this.consultation?.messages.length || 0;
          this.consultation = consultation || null;

          if (consultation) {
            // Mark messages as read only on initial load
            if (this.loading) {
              this.consultationService.markMessagesAsRead(consultationId);
            }

            // Scroll to bottom if new messages were added
            const currentMessageCount = consultation.messages.length;
            if (currentMessageCount > previousMessageCount) {
              this.scrollToBottomAfterRender();
            }
          }

          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading consultation:', error);
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  sendMessage(): void {
    if (
      !this.newMessage.trim() ||
      !this.consultation ||
      this.consultation.status !== ConsultationStatus.ACTIVE
    ) {
      return;
    }

    const message = this.newMessage.trim();
    this.newMessage = '';
    this.cdr.markForCheck();

    // Send message through service
    // The service will add the message to the consultation and emit the update
    // which we'll receive through our subscription
    this.consultationService
      .sendMessage(this.consultation.id, message)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Start typing animation for the response
          this.simulateTyping();
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.newMessage = message; // Restore message on error
          this.cdr.markForCheck();
        },
      });
  }

  handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  simulateTyping(): void {
    // Clear any existing typing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.isTyping = true;
    this.cdr.markForCheck();

    this.typingTimeout = window.setTimeout(
      () => {
        this.isTyping = false;
        this.typingTimeout = undefined;
        this.cdr.markForCheck();
      },
      2000 + Math.random() * 3000,
    );
  }

  scheduleVideoCall(): void {
    if (!this.consultation) return;

    const scheduledTime = new Date();
    scheduledTime.setHours(scheduledTime.getHours() + 1);

    this.consultationService
      .scheduleVideoCall(this.consultation.id, scheduledTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (videoCallInfo) => {
          console.log('Video call scheduled:', videoCallInfo);
          // Show success message
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error scheduling video call:', error);
        },
      });
  }

  makePhoneCall(): void {
    // TODO: Implement phone call functionality
    console.log('Starting phone call...');
  }

  endConsultation(): void {
    if (!this.consultation) return;

    this.consultationService
      .endConsultation(this.consultation.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showEndConfirmation = false;
          this.router.navigate(['/consultations']);
        },
        error: (error) => {
          console.error('Error ending consultation:', error);
          this.showEndConfirmation = false;
          this.cdr.markForCheck();
        },
      });
  }

  goBack(): void {
    this.location.back();
  }

  private scrollToBottomAfterRender(): void {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      this.scrollToBottom();
    }, 0);
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer?.nativeElement) {
        const element = this.scrollContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Could not scroll to bottom:', err);
    }
  }

  shouldShowDateSeparator(index: number): boolean {
    if (index === 0) return true;

    const messages = this.consultation?.messages;
    if (!messages || !messages[index] || !messages[index - 1]) return false;

    const currentDate = new Date(messages[index].timestamp).toDateString();
    const previousDate = new Date(messages[index - 1].timestamp).toDateString();

    return currentDate !== previousDate;
  }

  getMessageDate(timestamp: Date): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Heute';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Gestern';
    } else {
      return date.toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  }

  getMessageContainerClass(sender: MessageSender): string {
    switch (sender) {
      case MessageSender.PATIENT:
        return 'flex justify-end';
      case MessageSender.DOCTOR:
        return 'flex justify-start';
      case MessageSender.SYSTEM:
        return 'flex justify-center';
      default:
        return '';
    }
  }

  getMessageBubbleClass(sender: MessageSender): string {
    switch (sender) {
      case MessageSender.PATIENT:
        return 'chat-bubble-sent';
      case MessageSender.DOCTOR:
        return 'chat-bubble-received';
      case MessageSender.SYSTEM:
        return 'chat-bubble-system';
      default:
        return '';
    }
  }

  // Track by function for better performance
  trackByMessageId(index: number, message: Message): string {
    return message.id;
  }

  // Helper method to check if consultation is active
  isConsultationActive(): boolean {
    return this.consultation?.status === ConsultationStatus.ACTIVE;
  }

  // Helper method to check if consultation is completed
  isConsultationCompleted(): boolean {
    return this.consultation?.status === ConsultationStatus.COMPLETED;
  }

  // Helper method to check if message is from system
  isSystemMessage(message: Message): boolean {
    return message.sender === MessageSender.SYSTEM;
  }
}
