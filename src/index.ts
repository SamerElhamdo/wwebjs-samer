#!/usr/bin/env node

import { WhatsAppManager } from './whatsapp-manager.js';
import { WebhookManager } from './webhook-manager.js';

class WhatsAppMCPServer {
  private whatsappManager: WhatsAppManager;
  private webhookManager: WebhookManager;

  constructor() {
    this.whatsappManager = new WhatsAppManager();
    this.webhookManager = new WebhookManager();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // WhatsApp events to webhooks
    this.whatsappManager.on('message', (data) => {
      this.webhookManager.onMessage(data.sessionName, data.message);
    });

    this.whatsappManager.on('message_create', (data) => {
      this.webhookManager.onMessageCreate(data.sessionName, data.message);
    });

    this.whatsappManager.on('qr', (data) => {
      this.webhookManager.onQRCode(data.sessionName, data.qr);
    });

    this.whatsappManager.on('ready', (data) => {
      this.webhookManager.onReady(data.sessionName);
    });

    this.whatsappManager.on('authenticated', (data) => {
      this.webhookManager.onAuthenticated(data.sessionName);
    });

    this.whatsappManager.on('auth_failure', (data) => {
      this.webhookManager.onAuthFailure(data.sessionName, data.message);
    });

    this.whatsappManager.on('disconnected', (data) => {
      this.webhookManager.onDisconnected(data.sessionName, data.reason);
    });
  }

  async start() {
    try {
      console.log('🚀 Starting WhatsApp MCP Server...');
      
      // Set webhook from environment variable
      const webhookUrl = process.env.WEBHOOK_URL;
      if (webhookUrl) {
        console.log('📡 Setting webhook URL:', webhookUrl);
        await this.webhookManager.setWebhook(webhookUrl, ['message']);
      } else {
        console.log('⚠️  No webhook URL configured');
      }
      
      // Initialize WhatsApp session
      await this.whatsappManager.createSession('default');
      
      // Start webhook retry processor
      this.webhookManager.startRetryProcessor();
      
      console.log('✅ WhatsApp MCP Server started successfully');
      console.log('📡 Webhook URL: ' + (webhookUrl || 'Not configured'));
      
    } catch (error) {
      console.error('❌ Failed to start WhatsApp MCP Server:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new WhatsAppMCPServer();
server.start().catch(console.error);
