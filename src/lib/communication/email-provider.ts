import { logger } from "@/lib/logger";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

export interface EmailDeliveryProvider {
  readonly name: string;
  sendEmail(options: EmailOptions): Promise<EmailSendResult>;
}

export class ConsoleEmailProvider implements EmailDeliveryProvider {
  public readonly name = "ConsoleEmailProvider";
  private sentHistory: Array<EmailOptions & { messageId: string; timestamp: string }> = [];

  public async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date().toISOString();

    logger.info("📧 [EmailDeliveryProvider] Transmitting outbound email", {
      provider: this.name,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      messageId,
      timestamp,
    });

    const record = {
      ...options,
      messageId,
      timestamp,
    };
    this.sentHistory.push(record);

    return {
      success: true,
      messageId,
      timestamp,
    };
  }

  public getSentHistory() {
    return [...this.sentHistory];
  }

  public clearSentHistory() {
    this.sentHistory = [];
  }
}

// Global active email provider singleton
export const emailProvider = new ConsoleEmailProvider();
