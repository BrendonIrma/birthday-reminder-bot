# 🚀 Миграция Birthday Bot с Railway на Timeweb

## 📋 План миграции

### ✅ Этап 1: Подготовка (без простоя)
- [x] Резервное копирование данных (не нужно - данные в Supabase)
- [ ] Создание сервера на Timeweb
- [ ] Установка и настройка сервера
- [ ] Развертывание приложения

### ✅ Этап 2: Тестирование (без простоя)
- [ ] Тестирование на Timeweb
- [ ] Проверка всех функций
- [ ] Подготовка к переключению

### ✅ Этап 3: Переключение (5-10 минут простоя)
- [ ] Остановка Railway проекта
- [ ] Запуск на Timeweb
- [ ] Проверка работы

### ✅ Этап 4: Очистка
- [ ] Удаление Railway проекта (через 24-48 часов)

---

## 🖥️ Шаг 1: Создание сервера на Timeweb

### 1.1. Регистрация на Timeweb
1. Зайдите на [timeweb.com](https://timeweb.com)
2. Зарегистрируйтесь или войдите в аккаунт
3. Перейдите в раздел **"Облачные серверы"**

### 1.2. Создание сервера
**Рекомендуемая конфигурация:**
- **ОС**: Ubuntu 20.04 LTS или Ubuntu 22.04 LTS
- **CPU**: 1 vCPU (достаточно для бота)
- **RAM**: 1GB (минимум)
- **SSD**: 20GB (достаточно)
- **Регион**: Россия (ближайший к вам)

**Стоимость**: ~300-500₽/месяц

### 1.3. Настройка сервера
После создания сервера:
1. Получите IP-адрес сервера
2. Скопируйте root пароль
3. Подключитесь по SSH:
   ```bash
   ssh root@YOUR_SERVER_IP
   ```

---

## 🛠️ Шаг 2: Установка на сервере

### 2.1. Автоматическая установка (рекомендуется)
```bash
# Подключитесь к серверу
ssh root@YOUR_SERVER_IP

# Создайте обычного пользователя (рекомендуется)
adduser botuser
usermod -aG sudo botuser
su - botuser

# Скачайте и запустите скрипт установки
wget https://raw.githubusercontent.com/BrendonIrma/birthday-reminder-bot/main/scripts/timeweb-setup.sh
chmod +x timeweb-setup.sh
./timeweb-setup.sh
```

### 2.2. Ручная установка (если нужно)
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PM2
sudo npm install -g pm2

# Установка Git
sudo apt install git -y

# Клонирование репозитория
cd /var/www
sudo git clone https://github.com/BrendonIrma/birthday-reminder-bot.git
sudo chown -R $USER:$USER birthday-reminder-bot
cd birthday-reminder-bot

# Установка зависимостей
npm install
```

---

## ⚙️ Шаг 3: Настройка переменных окружения

### 3.1. Создание .env файла
```bash
cd /var/www/birthday-reminder-bot
cp timeweb.env.example .env
nano .env
```

### 3.2. Заполнение переменных
Скопируйте **ТЕ ЖЕ САМЫЕ** переменные, что используются на Railway:

```env
# Telegram Bot Token (ТОТ ЖЕ САМЫЙ!)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# DeepSeek API Key (ТОТ ЖЕ САМЫЙ!)
DEEPSEEK_API_KEY=sk-your-deepseek-api-key

# Supabase Configuration (ТЕ ЖЕ САМЫЕ!)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Настройки
REMINDER_TIME=09:00
TIMEZONE=Europe/Moscow
PORT=3000
NODE_ENV=production
```

**⚠️ ВАЖНО**: Используйте **ТЕ ЖЕ САМЫЕ** токены и ключи, что на Railway!

---

## 🚀 Шаг 4: Запуск бота

### 4.1. Создание конфигурации PM2
```bash
# Конфигурация уже создана скриптом
# Проверьте файл ecosystem.config.js
cat ecosystem.config.js
```

### 4.2. Запуск с PM2
```bash
# Запуск бота
pm2 start ecosystem.config.js

# Сохранение конфигурации PM2
pm2 save

# Настройка автозапуска при перезагрузке сервера
pm2 startup
```

### 4.3. Проверка статуса
```bash
# Проверка статуса
pm2 status

# Просмотр логов
pm2 logs birthday-bot

# Мониторинг в реальном времени
pm2 monit
```

---

## 🧪 Шаг 5: Тестирование (БЕЗ ОСТАНОВКИ Railway)

### 5.1. Тестирование функций
1. **Проверьте логи** - не должно быть ошибок
2. **Протестируйте команды**:
   - `/start` - должно работать
   - Добавление дня рождения - должно сохраняться в Supabase
   - Генерация поздравлений - должна работать
   - Меню идей подарков - должно открываться

### 5.2. Проверка базы данных
```bash
# Проверьте в Supabase Dashboard:
# 1. Перейдите в Table Editor
# 2. Проверьте таблицу birthdays
# 3. Убедитесь, что новые записи добавляются
```

---

## 🔄 Шаг 6: Переключение (5-10 минут простоя)

### 6.1. Подготовка к переключению
```bash
# На Timeweb сервере - убедитесь, что все работает
pm2 logs birthday-bot --lines 20
pm2 status
```

### 6.2. Остановка Railway проекта
1. Зайдите в [Railway Dashboard](https://railway.app)
2. Найдите ваш проект `birthday-reminder-bot`
3. Перейдите в настройки проекта
4. **ОСТАНОВИТЕ** сервис (НЕ УДАЛЯЙТЕ!)

### 6.3. Проверка работы на Timeweb
```bash
# На Timeweb сервере
pm2 restart birthday-bot
pm2 logs birthday-bot --lines 10
```

### 6.4. Тестирование в Telegram
1. Найдите вашего бота в Telegram
2. Отправьте `/start`
3. Добавьте тестовый день рождения
4. Проверьте все функции

---

## 🧹 Шаг 7: Очистка (через 24-48 часов)

### 7.1. Финальная проверка
После 24-48 часов успешной работы:

1. **Проверьте логи** - не должно быть ошибок
2. **Проверьте напоминания** - должны работать по расписанию
3. **Проверьте пользователей** - бот должен отвечать быстро

### 7.2. Удаление Railway проекта
1. Зайдите в [Railway Dashboard](https://railway.app)
2. Найдите ваш проект `birthday-reminder-bot`
3. Перейдите в настройки проекта
4. **УДАЛИТЕ** проект

---

## 🛠️ Управление ботом на Timeweb

### Полезные команды
```bash
# Переход в директорию проекта
cd /var/www/birthday-reminder-bot

# Управление ботом
./bot-control.sh start     # Запуск
./bot-control.sh stop      # Остановка
./bot-control.sh restart   # Перезапуск
./bot-control.sh status    # Статус
./bot-control.sh logs      # Логи

# Обновление бота
./update-bot.sh

# Ручное управление PM2
pm2 start birthday-bot
pm2 stop birthday-bot
pm2 restart birthday-bot
pm2 delete birthday-bot
pm2 status
pm2 logs birthday-bot
pm2 monit
```

### Мониторинг
```bash
# Просмотр логов в реальном времени
pm2 logs birthday-bot --follow

# Мониторинг ресурсов
htop
pm2 monit

# Проверка места на диске
df -h
```

---

## 🚨 Решение проблем

### Проблема: Бот не запускается
```bash
# Проверьте логи
pm2 logs birthday-bot

# Проверьте .env файл
cat .env

# Проверьте переменные окружения
pm2 env 0
```

### Проблема: Ошибки в логах
```bash
# Подробные логи
pm2 logs birthday-bot --lines 100

# Перезапуск с очисткой логов
pm2 flush
pm2 restart birthday-bot
```

### Проблема: Бот не отвечает
```bash
# Проверьте статус
pm2 status

# Перезапуск
pm2 restart birthday-bot

# Проверьте подключение к Supabase
# (должно быть в логах: "Connected to Supabase successfully")
```

---

## 📞 Поддержка

### Если что-то пошло не так:
1. **НЕ ПАНИКУЙТЕ** - Railway проект еще не удален
2. **Запустите Railway** обратно
3. **Исправьте проблемы** на Timeweb
4. **Повторите переключение**

### Полезные ссылки:
- [Timeweb Support](https://timeweb.com/help)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)

---

## ✅ Чек-лист миграции

- [ ] Сервер на Timeweb создан
- [ ] Node.js и PM2 установлены
- [ ] Репозиторий склонирован
- [ ] Зависимости установлены
- [ ] .env файл создан и заполнен
- [ ] Бот запущен с PM2
- [ ] PM2 настроен на автозапуск
- [ ] Тестирование прошло успешно
- [ ] Railway проект остановлен
- [ ] Бот работает на Timeweb
- [ ] Все функции протестированы
- [ ] Railway проект удален (через 24-48 часов)

**🎉 Поздравляем! Миграция завершена успешно!**