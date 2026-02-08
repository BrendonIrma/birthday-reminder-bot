# Используем официальный Node.js образ
FROM node:20-alpine

# 👉 добавляем CA сертификаты
RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN addgroup -g 1001 -S nodejs \
 && adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /app
USER nodejs

CMD ["npm", "start"]