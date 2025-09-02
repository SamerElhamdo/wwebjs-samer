# 🚀 دليل التشغيل السريع

## هيكل المجلدات

```
parent-folder/
├── docker-compose.yml          # ملف n8n + WhatsApp MCP
└── wwebjs-samer/              # مجلد المشروع
    ├── Dockerfile
    ├── package.json
    ├── src/
    └── ...
```

## خطوات التشغيل

### 1. الانتقال للمجلد الأب
```bash
cd ..  # من مجلد wwebjs-samer إلى المجلد الأب
```

### 2. إعداد متغيرات البيئة
انسخ ملف `.env.example` إلى `.env` في المجلد الأب:

```bash
cp wwebjs-samer/.env.example .env
```

ثم عدل القيم في ملف `.env`:

```bash
# إعدادات n8n
SUBDOMAIN=your-subdomain
DOMAIN_NAME=your-domain.com
SSL_EMAIL=your-email@domain.com
GENERIC_TIMEZONE=Asia/Riyadh

# إعدادات WhatsApp MCP
WEBHOOK_URL=https://your-subdomain.your-domain.com/webhook/whatsapp
```

### 3. تشغيل النظام
```bash
docker-compose up -d
```

### 4. عرض QR Code
```bash
docker-compose logs -f whatsapp-mcp
```

## إعداد n8n Workflow

1. افتح n8n في المتصفح
2. أنشئ workflow جديد
3. أضف **Webhook** node:
   - **Path**: `whatsapp`
   - **Method**: `POST`
4. أضف **HTTP Request** node للرد:
   - **URL**: `http://whatsapp-mcp:3000/send`
   - **Method**: `POST`
   - **Body**:
     ```json
     {
       "to": "{{ $json.data.message.from }}",
       "message": "تم استلام رسالتك: {{ $json.data.message.body }}",
       "sessionName": "default"
     }
     ```

## استكشاف الأخطاء

```bash
# فحص السجلات
docker-compose logs -f whatsapp-mcp

# إعادة تشغيل MCP
docker-compose restart whatsapp-mcp

# فحص الحاويات
docker-compose ps
```

---

✅ **جاهز للاستخدام!** النظام سيعمل بشكل صحيح من المجلد الأب.
