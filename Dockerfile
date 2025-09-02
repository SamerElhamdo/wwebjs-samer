FROM node:18-alpine

# تثبيت الحزم الأساسية وتشغيل Chromium بشكل سليم
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    mesa-gbm \
    udev \
    dumb-init \
    bash \
    curl


# إعداد Puppeteer لاستخدام Chromium المثبت
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# نسخ ملفات الباكج والـ tsconfig
COPY package*.json ./
COPY tsconfig.json ./

# تثبيت كل الـ dependencies (مع devDependencies للبناء)
RUN npm install

# نسخ السورس
COPY src/ ./src/

# بناء المشروع
RUN npm run build

# إزالة devDependencies لتخفيف الحجم
RUN npm prune --production

# إنشاء مجلد للجلسات
RUN mkdir -p /app/sessions

# تعريض البورت
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# تشغيل باستخدام dumb-init (لإدارة الـ signals بشكل صحيح)
ENTRYPOINT ["dumb-init", "--"]

# تشغيل التطبيق
CMD ["npm", "start"]
