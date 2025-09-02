// whatsapp-web.js is CommonJS; import runtime via default and types via type-only import
import whatsappWebPkg from 'whatsapp-web.js';
import type { Client as WWebClient, Message as WWebMessage, Contact as WWebContact, Chat as WWebChat } from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = whatsappWebPkg as any;
import * as qrcode from 'qrcode-terminal';
import { EventEmitter } from 'events';

export interface WhatsAppSession {
  client: WWebClient;
  isReady: boolean;
  qrCode: string | null;
  lastActivity: Date;
}

export class WhatsAppManager extends EventEmitter {
  private sessions: Map<string, WhatsAppSession> = new Map();
  private sessionConfigs: Map<string, any> = new Map();

  constructor() {
    super();
  }

  async createSession(sessionName: string = 'default'): Promise<WhatsAppSession> {
    if (this.sessions.has(sessionName)) {
      return this.sessions.get(sessionName)!;
    }

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: sessionName,
        dataPath: './sessions'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    });

    const session: WhatsAppSession = {
      client,
      isReady: false,
      qrCode: null,
      lastActivity: new Date()
    };

    // Set up event listeners
    client.on('qr', (qr: string) => {
      console.log('QR Code received for session:', sessionName);
      session.qrCode = qr;
      session.lastActivity = new Date();
      
      // Display QR code in terminal
      qrcode.generate(qr, { small: true });
      
      this.emit('qr', { sessionName, qr });
    });

    client.on('ready', () => {
      console.log('WhatsApp client is ready for session:', sessionName);
      session.isReady = true;
      session.qrCode = null;
      session.lastActivity = new Date();
      
      this.emit('ready', { sessionName });
    });

    client.on('authenticated', () => {
      console.log('WhatsApp client authenticated for session:', sessionName);
      session.lastActivity = new Date();
      
      this.emit('authenticated', { sessionName });
    });

    client.on('auth_failure', (msg: string) => {
      console.error('Authentication failed for session:', sessionName, msg);
      this.emit('auth_failure', { sessionName, message: msg });
    });

    client.on('disconnected', (reason: string) => {
      console.log('WhatsApp client disconnected for session:', sessionName, reason);
      session.isReady = false;
      session.lastActivity = new Date();
      
      this.emit('disconnected', { sessionName, reason });
    });

    client.on('message', async (message: WWebMessage) => {
      session.lastActivity = new Date();
      const msgData = {
        id: (message as any).id?._serialized,
        body: (message as any).body,
        type: (message as any).type,
        timestamp: (message as any).timestamp,
        from: (message as any).from,
        to: (message as any).to,
        fromMe: (message as any).fromMe,
        hasMedia: (message as any).hasMedia,
        isForwarded: (message as any).isForwarded,
      };
      this.emit('message', { sessionName, message: msgData });
    });

    client.on('message_create', async (message: WWebMessage) => {
      session.lastActivity = new Date();
      const msgData = {
        id: (message as any).id?._serialized,
        body: (message as any).body,
        type: (message as any).type,
        timestamp: (message as any).timestamp,
        from: (message as any).from,
        to: (message as any).to,
        fromMe: (message as any).fromMe,
        hasMedia: (message as any).hasMedia,
        isForwarded: (message as any).isForwarded,
      };
      this.emit('message_create', { sessionName, message: msgData });
    });

    this.sessions.set(sessionName, session);
    
    // Initialize the client
    await client.initialize();
    
    return session;
  }

  async getQRCode(sessionName: string = 'default'): Promise<any> {
    try {
      const session = await this.createSession(sessionName);
      
      if (session.qrCode) {
        return {
          content: [
            {
              type: 'text',
              text: `QR Code for session "${sessionName}":\n${session.qrCode}`
            }
          ]
        };
      } else if (session.isReady) {
        return {
          content: [
            {
              type: 'text',
              text: `Session "${sessionName}" is already authenticated and ready. No QR code needed.`
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Session "${sessionName}" is initializing. Please wait for QR code to be generated.`
            }
          ]
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting QR code: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  async sendMessage(to: string, message: string, sessionName: string = 'default'): Promise<any> {
    try {
      const session = this.sessions.get(sessionName);
      if (!session || !session.isReady) {
        return {
          content: [
            {
              type: 'text',
              text: `Session "${sessionName}" is not ready. Please authenticate first.`
            }
          ]
        };
      }

      const chatId = to.includes('@c.us') ? to : `${to}@c.us`;
      const result = await session.client.sendMessage(chatId, message);
      
      return {
        content: [
          {
            type: 'text',
            text: `Message sent successfully to ${to}. Message ID: ${result.id._serialized}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error sending message: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  async getContacts(sessionName: string = 'default'): Promise<any> {
    try {
      const session = this.sessions.get(sessionName);
      if (!session || !session.isReady) {
        return {
          content: [
            {
              type: 'text',
              text: `Session "${sessionName}" is not ready. Please authenticate first.`
            }
          ]
        };
      }

      const contacts = await session.client.getContacts();
      const contactsData = contacts.map((contact: WWebContact) => ({
        id: contact.id._serialized,
        name: contact.name || contact.pushname || 'Unknown',
        number: contact.number,
        isUser: contact.isUser,
        isGroup: contact.isGroup,
        isWAContact: contact.isWAContact
      }));

      return {
        content: [
          {
            type: 'text',
            text: `Found ${contactsData.length} contacts:\n${JSON.stringify(contactsData, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting contacts: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  async getChats(sessionName: string = 'default'): Promise<any> {
    try {
      const session = this.sessions.get(sessionName);
      if (!session || !session.isReady) {
        return {
          content: [
            {
              type: 'text',
              text: `Session "${sessionName}" is not ready. Please authenticate first.`
            }
          ]
        };
      }

      const chats = await session.client.getChats();
      const chatsData = chats.map((chat: WWebChat) => ({
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup,
        isReadOnly: chat.isReadOnly,
        unreadCount: chat.unreadCount,
        timestamp: chat.timestamp
      }));

      return {
        content: [
          {
            type: 'text',
            text: `Found ${chatsData.length} chats:\n${JSON.stringify(chatsData, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting chats: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  async getMessages(chatId: string, limit: number = 50, sessionName: string = 'default'): Promise<any> {
    try {
      const session = this.sessions.get(sessionName);
      if (!session || !session.isReady) {
        return {
          content: [
            {
              type: 'text',
              text: `Session "${sessionName}" is not ready. Please authenticate first.`
            }
          ]
        };
      }

      const chat = await session.client.getChatById(chatId);
      const messages = await (chat as WWebChat).fetchMessages({ limit });
      
      const messagesData = messages.map((message: WWebMessage) => ({
        id: message.id._serialized,
        body: message.body,
        type: message.type,
        timestamp: message.timestamp,
        from: message.from,
        to: message.to,
        fromMe: message.fromMe,
        hasMedia: message.hasMedia,
        isForwarded: message.isForwarded
      }));

      return {
        content: [
          {
            type: 'text',
            text: `Found ${messagesData.length} messages from chat ${chatId}:\n${JSON.stringify(messagesData, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting messages: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  async disconnect(sessionName: string = 'default'): Promise<any> {
    try {
      const session = this.sessions.get(sessionName);
      if (!session) {
        return {
          content: [
            {
              type: 'text',
              text: `Session "${sessionName}" not found.`
            }
          ]
        };
      }

      await session.client.destroy();
      this.sessions.delete(sessionName);
      
      return {
        content: [
          {
            type: 'text',
            text: `Session "${sessionName}" disconnected successfully.`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error disconnecting session: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  async getSessionStatus(sessionName: string = 'default'): Promise<any> {
    try {
      const session = this.sessions.get(sessionName);
      if (!session) {
        return {
          content: [
            {
              type: 'text',
              text: `Session "${sessionName}" not found.`
            }
          ]
        };
      }

      const status = {
        sessionName,
        isReady: session.isReady,
        hasQRCode: !!session.qrCode,
        lastActivity: session.lastActivity,
        clientInfo: session.client.info ? {
          wid: session.client.info.wid._serialized,
          pushname: session.client.info.pushname,
          platform: session.client.info.platform
        } : null
      };

      return {
        content: [
          {
            type: 'text',
            text: `Session Status:\n${JSON.stringify(status, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting session status: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  getSession(sessionName: string = 'default'): WhatsAppSession | undefined {
    return this.sessions.get(sessionName);
  }

  getAllSessions(): Map<string, WhatsAppSession> {
    return this.sessions;
  }
}
