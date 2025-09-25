#!/bin/bash

# 🛡️ Скрипт исправления уязвимостей безопасности
# Автор: Birthday Bot Security Fix
# Версия: 1.0

set -e

echo "🛡️ Исправление уязвимостей безопасности..."
echo "========================================"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Проверка, что мы в правильной директории
if [ ! -f "package.json" ]; then
    log_error "package.json не найден! Запустите скрипт из корневой директории проекта."
    exit 1
fi

log_info "Проверка текущих уязвимостей..."
npm audit

log_info "Обновление зависимостей..."
npm update

log_info "Исправление уязвимостей (безопасный режим)..."
npm audit fix

log_info "Проверка результата..."
npm audit

log_warning "Если остались уязвимости, попробуйте:"
echo "  npm audit fix --force"
echo "  (ВНИМАНИЕ: может сломать совместимость!)"

log_success "Исправление завершено!"
echo ""
echo "📋 СЛЕДУЮЩИЕ ШАГИ:"
echo "1. Протестируйте бота: npm start"
echo "2. Проверьте все функции"
echo "3. Если что-то сломалось, откатитесь:"
echo "   git checkout package-lock.json"
echo "   npm install"
echo ""