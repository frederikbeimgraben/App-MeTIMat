export interface Message {
  id: string;
  sender: MessageSender;
  content: string;
  timestamp: Date;
  type: MessageType;
  metadata?: MessageMetadata;
}

export enum MessageSender {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  SYSTEM = 'system'
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  VOICE = 'voice',
  VIDEO_CALL_REQUEST = 'video_call_request',
  PRESCRIPTION = 'prescription',
  APPOINTMENT = 'appointment',
  SYSTEM_NOTIFICATION = 'system_notification'
}

export interface MessageMetadata {
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number; // For voice messages in seconds
  thumbnailUrl?: string; // For images/videos
  prescriptionId?: string;
  appointmentId?: string;
  callDuration?: number; // For video calls in seconds
}

export interface MessageGroup {
  date: Date;
  messages: Message[];
}

export class MessageBuilder {
  private message: Partial<Message> = {
    type: MessageType.TEXT,
    timestamp: new Date()
  };

  constructor() {
    this.message.id = this.generateId();
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  withSender(sender: MessageSender): MessageBuilder {
    this.message.sender = sender;
    return this;
  }

  withContent(content: string): MessageBuilder {
    this.message.content = content;
    return this;
  }

  withType(type: MessageType): MessageBuilder {
    this.message.type = type;
    return this;
  }

  withMetadata(metadata: MessageMetadata): MessageBuilder {
    this.message.metadata = metadata;
    return this;
  }

  withTimestamp(timestamp: Date): MessageBuilder {
    this.message.timestamp = timestamp;
    return this;
  }

  build(): Message {
    if (!this.message.sender) {
      throw new Error('Message sender is required');
    }
    if (!this.message.content) {
      throw new Error('Message content is required');
    }
    return this.message as Message;
  }
}
