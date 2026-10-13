export interface NotificationMessage {
  id: string;
  timestamp: string;
  channel: string;
  recipient: string;
  subject: string;
  body: string;
  metadata?: Record<string, any>;
}

export class NotificationDispatcher {
  private messages: NotificationMessage[] = [];

  public send(message: { channel: string; recipient: string; subject: string; body: string; metadata?: Record<string, any> }): NotificationMessage {
    const msg: NotificationMessage = {
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      channel: message.channel,
      recipient: message.recipient,
      subject: message.subject,
      body: message.body,
      metadata: message.metadata
    };
    this.messages.unshift(msg);
    return msg;
  }

  public listMessages(): NotificationMessage[] {
    return [...this.messages];
  }

  public getLatestMessage(): NotificationMessage | undefined {
    return this.messages[0];
  }

  public reset() {
    this.messages = [];
  }
}

export const defaultNotifications = new NotificationDispatcher();
