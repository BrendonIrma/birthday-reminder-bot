#!/bin/bash

# 🚀 Скрипт установки Birthday Bot на Timeweb
# Автор: Birthday Bot Migration Script
# Версия: 1.0

set -e  # Остановка при ошибке

echo "🎂 Установка Birthday Bot на Timeweb..."
echo "=================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Проверка прав root
if [ "$EUID" -eq 0 ]; then
    log_error "Не запускайте этот скрипт от root! Используйте обычного пользователя."
    exit 1
fi

# Обновление системы
log_info "Обновление системы..."
sudo apt update && sudo apt upgrade -y
log_success "Система обновлена"

# Установка Node.js 18+
log_info "Установка Node.js 18+..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
log_success "Node.js установлен: $(node --version)"

# Установка PM2
log_info "Установка PM2..."
sudo npm install -g pm2
log_success "PM2 установлен: $(pm2 --version)"

# Установка Git
log_info "Установка Git..."
sudo apt install git -y
log_success "Git установлен: $(git --version)"

# Установка дополнительных утилит
log_info "Установка дополнительных утилит..."
sudo apt install curl wget nano htop -y
log_success "Утилиты установлены"

# Создание директории для приложений
log_info "Создание директории для приложений..."
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
log_success "Директория /var/www создана"

# Клонирование репозитория
log_info "Клонирование репозитория..."
cd /var/www
if [ -d "birthday-reminder-bot" ]; then
    log_warning "Директория birthday-reminder-bot уже существует. Обновляем..."
    cd birthday-reminder-bot
    git pull origin main
else
    git clone https://github.com/BrendonIrma/birthday-reminder-bot.git
    cd birthday-reminder-bot
fi
log_success "Репозиторий готов"

# Установка зависимостей
log_info "Установка зависимостей Node.js..."
npm install
log_success "Зависимости установлены"

# Создание конфигурации PM2
log_info "Создание конфигурации PM2..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'birthday-bot',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF
log_success "Конфигурация PM2 создана"

# Создание директории для логов
log_info "Создание директории для логов..."
mkdir -p logs
log_success "Директория для логов создана"

# Создание скрипта обновления
log_info "Создание скрипта обновления..."
cat > update-bot.sh << 'EOF'
#!/bin/bash
echo "🔄 Обновление Birthday Bot..."
cd /var/www/birthday-reminder-bot

# Остановка бота
pm2 stop birthday-bot 2>/dev/null || true

# Получение обновлений
git pull origin main

# Установка зависимостей
npm install

# Запуск бота
pm2 start birthday-bot

echo "✅ Бот обновлен и перезапущен!"
EOF

chmod +x update-bot.sh
log_success "Скрипт обновления создан"

# Создание скрипта управления
log_info "Создание скрипта управления..."
cat > bot-control.sh << 'EOF'
#!/bin/bash

case "$1" in
    start)
        echo "🚀 Запуск бота..."
        pm2 start birthday-bot
        ;;
    stop)
        echo "⏹️  Остановка бота..."
        pm2 stop birthday-bot
        ;;
    restart)
        echo "🔄 Перезапуск бота..."
        pm2 restart birthday-bot
        ;;
    status)
        echo "📊 Статус бота:"
        pm2 status
        ;;
    logs)
        echo "📋 Логи бота:"
        pm2 logs birthday-bot --lines 50
        ;;
    *)
        echo "Использование: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
EOF

chmod +x bot-control.sh
log_success "Скрипт управления создан"

# Настройка файрвола
log_info "Настройка файрвола..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
log_success "Файрвол настроен"

echo ""
echo "🎉 УСТАНОВКА ЗАВЕРШЕНА!"
echo "======================"
echo ""
echo "📝 СЛЕДУЮЩИЕ ШАГИ:"
echo "1. Создайте файл .env с переменными окружения:"
echo "   nano /var/www/birthday-reminder-bot/.env"
echo ""
echo "2. Добавьте в .env следующие переменные:"
echo "   TELEGRAM_BOT_TOKEN=your_bot_token_here"
echo "   DEEPSEEK_API_KEY=your_deepseek_api_key_here"
echo "   SUPABASE_URL=https://your-project.supabase.co"
echo "   SUPABASE_ANON_KEY=your_supabase_anon_key_here"
echo "   REMINDER_TIME=09:00"
echo "   TIMEZONE=Europe/Moscow"
echo "   PORT=3000"
echo ""
echo "3. Запустите бота:"
echo "   cd /var/www/birthday-reminder-bot"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "4. Проверьте статус:"
echo "   pm2 status"
echo "   pm2 logs birthday-bot"
echo ""
echo "🛠️  ПОЛЕЗНЫЕ КОМАНДЫ:"
echo "   ./bot-control.sh start    - Запуск бота"
echo "   ./bot-control.sh stop     - Остановка бота"
echo "   ./bot-control.sh restart  - Перезапуск бота"
echo "   ./bot-control.sh status   - Статус бота"
echo "   ./bot-control.sh logs     - Просмотр логов"
echo "   ./update-bot.sh           - Обновление бота"
echo ""
log_success "Готово к настройке!"