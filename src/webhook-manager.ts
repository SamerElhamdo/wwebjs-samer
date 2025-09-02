import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';

export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  timeout?: number;
  retries?: number;
}

export class WebhookManager extends EventEmitter {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private httpClient: AxiosInstance;
  private retryQueue: Map<string, any[]> = new Map();

  constructor() {
    super();
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsApp-MCP-SSE/1.0.0'
      }
    });
  }

  async setWebhook(url: string, events: string[] = ['message']): Promise<any> {
    try {
      // Validate URL
      new URL(url);

      const webhookConfig: WebhookConfig = {
        url,
        events,
        timeout: 10000,
        retries: 3
      };

      this.webhooks.set(url, webhookConfig);

      // Test webhook with a ping
      await this.sendWebhook(url, {
        event: 'webhook_test',
        timestamp: new Date().toISOString(),
        data: { message: 'Webhook configured successfully' }
      });

      return {
        content: [
          {
            type: 'text',
            text: `Webhook configured successfully for URL: ${url}\nEvents: ${events.join(', ')}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error setting webhook: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  async removeWebhook(url: string): Promise<any> {
    try {
      const removed = this.webhooks.delete(url);
      
      if (removed) {
        return {
          content: [
            {
              type: 'text',
              text: `Webhook removed successfully for URL: ${url}`
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Webhook not found for URL: ${url}`
            }
          ]
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error removing webhook: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  async getWebhooks(): Promise<any> {
    try {
      const webhookList = Array.from(this.webhooks.entries()).map(([url, config]) => ({
        url,
        events: config.events,
        timeout: config.timeout,
        retries: config.retries
      }));

      return {
        content: [
          {
            type: 'text',
            text: `Configured webhooks:\n${JSON.stringify(webhookList, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting webhooks: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  async sendWebhook(url: string, data: any): Promise<boolean> {
    try {
      const webhookConfig = this.webhooks.get(url);
      if (!webhookConfig) {
        console.warn(`Webhook not configured for URL: ${url}`);
        return false;
      }

      const payload = {
        ...data,
        timestamp: new Date().toISOString(),
        source: 'whatsapp-mcp-sse'
      };

      await this.httpClient.post(url, payload, {
        timeout: webhookConfig.timeout,
        headers: {
          'X-Webhook-Secret': webhookConfig.secret || '',
          'X-Webhook-Event': data.event || 'unknown'
        }
      });

      console.log(`Webhook sent successfully to: ${url}`);
      return true;
    } catch (error) {
      console.error(`Failed to send webhook to ${url}:`, error);
      
      // Add to retry queue
      this.addToRetryQueue(url, data);
      return false;
    }
  }

  private addToRetryQueue(url: string, data: any): void {
    if (!this.retryQueue.has(url)) {
      this.retryQueue.set(url, []);
    }
    
    const queue = this.retryQueue.get(url)!;
    queue.push({
      data,
      timestamp: new Date(),
      retries: 0
    });
  }

  async processRetryQueue(): Promise<void> {
    for (const [url, queue] of this.retryQueue.entries()) {
      const webhookConfig = this.webhooks.get(url);
      if (!webhookConfig) {
        this.retryQueue.delete(url);
        continue;
      }

      const itemsToRetry = queue.filter(item => 
        item.retries < (webhookConfig.retries || 3) &&
        (Date.now() - item.timestamp.getTime()) < 300000 // 5 minutes
      );

      for (const item of itemsToRetry) {
        try {
          const success = await this.sendWebhook(url, item.data);
          if (success) {
            queue.splice(queue.indexOf(item), 1);
          } else {
            item.retries++;
          }
        } catch (error) {
          item.retries++;
        }
      }

      // Remove old items
      const validItems = queue.filter(item => 
        item.retries < (webhookConfig.retries || 3) &&
        (Date.now() - item.timestamp.getTime()) < 300000
      );
      
      if (validItems.length === 0) {
        this.retryQueue.delete(url);
      } else {
        this.retryQueue.set(url, validItems);
      }
    }
  }

  async sendEventToWebhooks(event: string, data: any): Promise<void> {
    // إرسال webhook فقط للرسائل القادمة
    if (event !== 'message') {
      return;
    }

    const promises: Promise<boolean>[] = [];

    for (const [url, config] of this.webhooks.entries()) {
      if (config.events.includes(event) || config.events.includes('*')) {
        promises.push(this.sendWebhook(url, { event, data }));
      }
    }

    await Promise.allSettled(promises);
  }

  // Event handlers for WhatsApp events
  onQRCode(sessionName: string, qr: string): void {
    this.sendEventToWebhooks('qr', {
      sessionName,
      qr,
      timestamp: new Date().toISOString()
    });
  }

  onReady(sessionName: string): void {
    this.sendEventToWebhooks('ready', {
      sessionName,
      timestamp: new Date().toISOString()
    });
  }

  onMessage(sessionName: string, message: any): void {
    this.sendEventToWebhooks('message', {
      sessionName,
      message,
      timestamp: new Date().toISOString()
    });
  }

  onMessageCreate(sessionName: string, message: any): void {
    this.sendEventToWebhooks('message_create', {
      sessionName,
      message,
      timestamp: new Date().toISOString()
    });
  }

  onAuthenticated(sessionName: string): void {
    this.sendEventToWebhooks('authenticated', {
      sessionName,
      timestamp: new Date().toISOString()
    });
  }

  onAuthFailure(sessionName: string, message: string): void {
    this.sendEventToWebhooks('auth_failure', {
      sessionName,
      message,
      timestamp: new Date().toISOString()
    });
  }

  onDisconnected(sessionName: string, reason: string): void {
    this.sendEventToWebhooks('disconnected', {
      sessionName,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  // Start retry queue processing
  startRetryProcessor(): void {
    setInterval(() => {
      this.processRetryQueue();
    }, 30000); // Process every 30 seconds
  }
}
