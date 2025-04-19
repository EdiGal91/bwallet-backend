import { Injectable } from '@nestjs/common';
import { EmailService } from './email.service';

// Types for different notification channels
export type NotificationChannel = 'email'; // | 'sms' | 'push' | 'inApp';

export interface NotificationOptions {
  channels?: NotificationChannel[];
  data?: Record<string, any>; // For any additional data that might be needed
}

@Injectable()
export class NotificationsService {
  constructor(private emailService: EmailService) {}

  /**
   * Send account verification notification
   */
  async sendVerificationNotification(
    userId: string,
    email: string,
    verificationLink: string,
    options: NotificationOptions = {},
  ): Promise<void> {
    const channels = options.channels || ['email'];

    // Currently we only support email, but this can be expanded
    if (channels.includes('email')) {
      await this.emailService.sendVerificationEmail(email, verificationLink);
    }

    // Future implementations for other channels:
    // if (channels.includes('sms')) { ... }
    // if (channels.includes('push')) { ... }
    // if (channels.includes('inApp')) { ... }
  }

  /**
   * Send welcome notification after account verification
   */
  async sendWelcomeNotification(
    userId: string,
    email: string,
    options: NotificationOptions = {},
  ): Promise<void> {
    const channels = options.channels || ['email'];

    // Placeholder implementation - will be expanded later
    if (channels.includes('email')) {
      // We'll implement this properly later
      await Promise.resolve();
    }
  }

  /**
   * Send password reset notification
   */
  async sendPasswordResetNotification(
    userId: string,
    email: string,
    resetLink: string,
    options: NotificationOptions = {},
  ): Promise<void> {
    const channels = options.channels || ['email'];

    // Placeholder implementation - will be expanded later
    if (channels.includes('email')) {
      // We'll implement this properly later
      await Promise.resolve();
    }
  }
}
