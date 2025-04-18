import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!resendApiKey) {
      console.warn(
        'RESEND_API_KEY is not set. Email functionality will not work.',
      );
    }
    this.resend = new Resend(resendApiKey);
  }

  async sendVerificationEmail(
    email: string,
    verificationLink: string,
  ): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'BWallet <delivered@resend.dev>', // Update this with your domain
        to: email,
        subject: 'Verify your email address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Verify your email address</h2>
            <p>Thanks for signing up for BWallet! Please verify your email address to complete your registration.</p>
            <div style="margin: 30px 0;">
              <a href="${verificationLink}" 
                 style="background-color: #4f46e5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p>If the button above doesn't work, you can also click on the link below or copy it into your web browser:</p>
            <p style="word-break: break-all; color: #3b82f6;">
              <a href="${verificationLink}" style="color: #3b82f6;">${verificationLink}</a>
            </p>
            <p>This verification link will expire in 24 hours.</p>
            <p>If you did not create an account, you can safely ignore this email.</p>
          </div>
        `,
      });

      if (error) {
        console.error('Failed to send verification email:', error);
        throw new Error(`Failed to send verification email: ${error.message}`);
      }

      console.log('Verification email sent:', data);
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }
}
