#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { WhatsAppManager } from './whatsapp-manager.js';
import { WebhookManager } from './webhook-manager.js';

class WhatsAppMCPServer {
  private whatsappManager: WhatsAppManager;
  private webhookManager: WebhookManager;
  private app = express();
  private port = Number(process.env.PORT || 3000);

  constructor() {
    this.whatsappManager = new WhatsAppManager();
    this.webhookManager = new WebhookManager();
    this.setupEventHandlers();
    this.setupHttpServer();
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

  private setupHttpServer() {
    this.app.use(cors());
    this.app.use(express.json());

    // Healthcheck
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', time: new Date().toISOString() });
    });

    // Info endpoint for SSE placeholder
    this.app.get('/sse/info', (_req, res) => {
      res.json({ sse: false, message: 'SSE not implemented in this build' });
    });

    // Get QR code for a session
    this.app.get('/qr/:session', async (req, res) => {
      const sessionName = req.params.session || 'default';
      const result = await this.whatsappManager.getQRCode(sessionName);
      res.json(result);
    });

    // Get status for a session
    this.app.get('/status/:session', async (req, res) => {
      const sessionName = req.params.session || 'default';
      const result = await this.whatsappManager.getSessionStatus(sessionName);
      res.json(result);
    });

    // Send message
    this.app.post('/send', async (req, res) => {
      const { to, message, sessionName = 'default' } = req.body || {};
      if (!to || !message) {
        return res.status(400).json({ error: 'to and message are required' });
      }
      const result = await this.whatsappManager.sendMessage(to, message, sessionName);
      res.json(result);
    });

    // Webhooks
    this.app.get('/webhooks', async (_req, res) => {
      const result = await this.webhookManager.getWebhooks();
      res.json(result);
    });

    this.app.post('/webhooks', async (req, res) => {
      const { url, events = ['message'] } = req.body || {};
      if (!url) {
        return res.status(400).json({ error: 'url is required' });
      }
      const result = await this.webhookManager.setWebhook(url, events);
      res.json(result);
    });

    this.app.delete('/webhooks', async (req, res) => {
      const url = (req.query.url as string) || (req.body && req.body.url);
      if (!url) {
        return res.status(400).json({ error: 'url is required' });
      }
      const result = await this.webhookManager.removeWebhook(url);
      res.json(result);
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
      await this.whatsappManager.createSession(process.env.SESSION_NAME || 'default');

      // Start webhook retry processor
      this.webhookManager.startRetryProcessor();

      // Start HTTP server
      this.app.listen(this.port, () => {
        console.log(`🌐 HTTP server listening on port ${this.port}`);
      });

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
