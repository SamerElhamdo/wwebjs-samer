# 🚀 WhatsApp MCP Server for n8n

نظام WhatsApp MCP Server بسيط ومتكامل مع n8n لإرسال webhooks للرسائل القادمة فقط.

## 🎯 نظرة عامة

هذا المشروع يوفر:
- **WhatsApp Web JS Integration** - تكامل مع WhatsApp Web
- **Webhook System** - إرسال webhooks للرسائل القادمة إلى n8n
- **Docker Support** - إعداد Docker كامل مع n8n

## المميزات

- ✅ **WhatsApp Integration** - تكامل مباشر مع WhatsApp Web
- ✅ **Webhook System** - إرسال webhooks للرسائل القادمة فقط
- ✅ **n8n Integration** - تكامل كامل مع n8n
- ✅ **Docker Support** - إعداد Docker بسيط
- ✅ **Auto QR Code** - عرض QR Code تلقائياً في السجلات

## كيفية العمل

1. **تشغيل النظام**: يتم تشغيل WhatsApp MCP Server مع n8n
2. **عرض QR Code**: يظهر QR Code في سجلات Docker للاتصال بـ WhatsApp
3. **استقبال الرسائل**: عند استلام رسالة، يتم إرسال webhook إلى n8n
4. **معالجة في n8n**: يمكنك إنشاء workflows في n8n للرد على الرسائل

## التثبيت والتشغيل

### 1. إعداد متغيرات البيئة

أضف هذه المتغيرات إلى ملف `.env` الخاص بك:

```bash
# إعدادات n8n
SUBDOMAIN=your-subdomain
DOMAIN_NAME=your-domain.com
SSL_EMAIL=your-email@domain.com
GENERIC_TIMEZONE=Asia/Riyadh

# إعدادات WhatsApp MCP
WEBHOOK_URL=https://your-subdomain.your-domain.com/webhook/whatsapp
```

### 2. تشغيل النظام

```bash
docker-compose up -d
```

### 3. عرض QR Code

```bash
docker-compose logs -f whatsapp-mcp
```

ستظهر QR Code في السجلات - امسحها بـ WhatsApp للاتصال.

## إعداد n8n Workflow

### 1. إنشاء Webhook في n8n

1. افتح n8n في المتصفح
2. أنشئ workflow جديد
3. أضف **Webhook** node مع:
   - **Path**: `whatsapp`
   - **Method**: `POST`

### 2. معالجة الرسائل

أضف **HTTP Request** node للرد على الرسائل:

```json
{
  "url": "http://whatsapp-mcp:3000/send",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "to": "{{ $json.data.message.from }}",
    "message": "تم استلام رسالتك: {{ $json.data.message.body }}",
    "sessionName": "default"
  }
}
```

### 3. مثال على Workflow

```json
{
  "nodes": [
    {
      "name": "WhatsApp Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "whatsapp",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Send Reply",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://whatsapp-mcp:3000/send",
        "method": "POST",
        "body": {
          "to": "{{ $json.data.message.from }}",
          "message": "مرحباً! تم استلام رسالتك.",
          "sessionName": "default"
        }
      }
    }
  ]
}
```

## Webhook Payload

النظام يرسل webhook فقط عند استلام رسالة جديدة:

```json
{
  "event": "message",
  "data": {
    "sessionName": "default",
    "message": {
      "id": "message_id",
      "body": "نص الرسالة",
      "from": "1234567890@c.us",
      "to": "0987654321@c.us",
      "timestamp": 1234567890,
      "fromMe": false,
      "type": "chat"
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z",
  "source": "whatsapp-mcp"
}
```

## متغيرات البيئة

```bash
# إعدادات n8n
SUBDOMAIN=your-subdomain
DOMAIN_NAME=your-domain.com
SSL_EMAIL=your-email@domain.com
GENERIC_TIMEZONE=Asia/Riyadh

# إعدادات WhatsApp MCP
WEBHOOK_URL=https://your-subdomain.your-domain.com/webhook/whatsapp
SESSION_NAME=default
WHATSAPP_SESSION_PATH=/app/sessions
WHATSAPP_HEADLESS=true
WHATSAPP_TIMEOUT=60000
```

## استكشاف الأخطاء

### فحص حالة النظام:
```bash
# فحص السجلات
docker-compose logs -f whatsapp-mcp

# فحص الحاويات
docker-compose ps

# إعادة تشغيل MCP
docker-compose restart whatsapp-mcp
```

### مشاكل شائعة:

1. **QR Code لا يظهر**: تحقق من السجلات
2. **Webhook لا يعمل**: تأكد من صحة URL
3. **الرسائل لا تصل**: تحقق من اتصال WhatsApp

## الأمان

- استخدم HTTPS للـ webhooks في الإنتاج
- تأكد من صحة إعدادات SSL
- استخدم كلمات مرور قوية

## الترخيص

MIT License

---

🎯 **النتيجة**: نظام WhatsApp متكامل مع n8n لإرسال webhooks للرسائل القادمة فقط!
