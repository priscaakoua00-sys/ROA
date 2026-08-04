export interface WhatsAppSendResult {
  status: 'sent' | 'error';
  externalId?: string;
  error?: string;
}

export interface WhatsAppProvider {
  sendText(to: string, body: string): Promise<WhatsAppSendResult>;
}
