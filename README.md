# 🎂 Birthday Reminder Bot with Supabase

Телеграм-бот для напоминаний о днях рождения с ИИ-генерацией поздравлений и идей подарков, использующий Supabase как облачную базу данных.

## 📋 Описание

Этот бот позволяет пользователям:
- Добавлять дни рождения, отправляя сообщения в произвольном формате
- Получать автоматические напоминания в день рождения
- Получать персонализированные поздравления, сгенерированные ИИ (DeepSeek)
- Получать идеи подарков, адаптированные под конкретного человека
- Работать с облачной базой данных Supabase

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка Supabase

1. Создайте проект на [Supabase](https://supabase.com)
2. В SQL Editor выполните скрипт из файла `supabase/schema.sql`
3. Получите URL проекта и anon key из Settings → API

### 3. Настройка переменных окружения

Скопируйте файл `env.example` в `.env` и заполните необходимые данные:

```bash
cp env.example .env
```

Отредактируйте файл `.env`:

```env
# Telegram Bot Token (получите у @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# DeepSeek API Key (для генерации поздравлений и идей подарков)
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Настройки напоминаний (время в формате cron)
REMINDER_TIME=09:00

# Часовой пояс
TIMEZONE=Europe/Moscow
```

### 4. Получение токенов

#### Telegram Bot Token
1. Найдите @BotFather в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Скопируйте полученный токен в `.env`

#### DeepSeek API Key (опционально)
1. Зарегистрируйтесь на [DeepSeek](https://platform.deepseek.com/)
2. Создайте API ключ в разделе API Keys
3. Скопируйте ключ в `.env`

#### Supabase Credentials
1. Создайте проект на [Supabase](https://supabase.com)
2. Выполните SQL скрипт из `supabase/schema.sql`
3. Скопируйте URL и anon key из Settings → API

> **Примечание**: Если не указать DeepSeek API ключ, бот будет использовать предустановленные шаблоны поздравлений и идей подарков.

### 5. Запуск бота

```bash
# Обычный запуск
npm start

# Запуск в режиме разработки (с автоперезагрузкой)
npm run dev

# Настройка (создание .env файла)
npm run setup
```

## 📱 Использование

### Команды бота

- `/start` - Начать работу с ботом
- `/list` - Показать список всех дней рождения
- `/help` - Показать справку

### Добавление дня рождения

Отправьте боту сообщение в одном из форматов:

```
Имя, дата рождения, краткая информация
```

**Примеры:**
- `Анна, 3 марта, моя сестра, любит книги`
- `Петр, 15.05.1990, коллега, программист`
- `Елена, 14 февраля, подруга, любит цветы`

**Поддерживаемые форматы дат:**
- `15.03.1990` (числовой формат)
- `15.03.90`
- `15.3.1990`
- `15.3.90`
- `15.03` (текущий год)
- `3 марта` (текстовый формат)
- `15 мая 1990`
- `марта 3`
- `мая 15 2000`

### Автоматические напоминания

Бот автоматически:
- Отправляет напоминания в день рождения в 09:00
- Генерирует персонализированные поздравления (максимум 100 символов)
- Предлагает идеи подарков (максимум 100 символов)

## 🏗️ Архитектура

### Структура проекта

```
birthday-bot/
├── src/
│   ├── index.js              # Основной файл бота
│   ├── database.js           # Работа с Supabase
│   ├── messageParser.js      # Парсинг сообщений пользователя
│   ├── birthdayReminder.js   # Система напоминаний
│   └── aiAssistant.js        # ИИ-генерация поздравлений и подарков
├── supabase/
│   └── schema.sql            # SQL скрипт для создания таблиц
├── scripts/
│   └── setup.js              # Скрипт настройки
├── package.json
├── env.example
├── Dockerfile
├── docker-compose.yml
└── README.md
```

### Модули

- **SupabaseDatabase** - Управление облачной базой данных Supabase
- **MessageParser** - Парсинг и валидация сообщений пользователя
- **BirthdayReminder** - Система напоминаний и cron-задач
- **AIAssistant** - Генерация поздравлений и идей подарков через DeepSeek API

## ☁️ Развертывание в облаке

### Railway
1. Подключите GitHub репозиторий к Railway
2. Установите переменные окружения:
   - `TELEGRAM_BOT_TOKEN`
   - `DEEPSEEK_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. Railway автоматически развернет бота

### Render
1. Создайте новый Web Service в Render
2. Подключите GitHub репозиторий
3. Установите переменные окружения
4. Render автоматически соберет и запустит бота

### Heroku
1. Создайте приложение в Heroku
2. Подключите GitHub репозиторий
3. Установите переменные окружения в Settings → Config Vars
4. Heroku автоматически развернет бота

### Docker
```bash
# Сборка образа
docker build -t birthday-bot .

# Запуск контейнера
docker run -d \
  --name birthday-bot \
  -e TELEGRAM_BOT_TOKEN=your_token \
  -e DEEPSEEK_API_KEY=your_key \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_ANON_KEY=your_key \
  birthday-bot
```

### Docker Compose
```bash
# Создайте .env файл с переменными
cp env.example .env

# Запустите через docker-compose
docker-compose up -d
```

## 🗄️ База данных Supabase

### Создание таблицы

Выполните SQL скрипт из файла `supabase/schema.sql` в SQL Editor Supabase:

```sql
-- Создание таблицы для дней рождения
CREATE TABLE IF NOT EXISTS birthdays (
    id SERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_birthdays_chat_id ON birthdays(chat_id);
CREATE INDEX IF NOT EXISTS idx_birthdays_birth_date ON birthdays(birth_date);
CREATE INDEX IF NOT EXISTS idx_birthdays_month_day ON birthdays(EXTRACT(MONTH FROM birth_date), EXTRACT(DAY FROM birth_date));
```

### Структура таблицы

- `id` - Уникальный идентификатор
- `chat_id` - ID чата в Telegram
- `name` - Имя человека
- `birth_date` - Дата рождения (DATE)
- `info` - Дополнительная информация
- `created_at` - Дата создания записи
- `updated_at` - Дата последнего обновления

## 🔧 Настройка

### Изменение времени напоминаний

В файле `src/index.js` найдите строку:

```javascript
cron.schedule('0 9 * * *', async () => {
```

Измените `0 9` на нужное время (часы:минуты в 24-часовом формате).

### Настройка часового пояса

В файле `src/birthdayReminder.js` добавьте:

```javascript
moment.tz.setDefault('Europe/Moscow');
```

## 🚨 Устранение неполадок

### Бот не отвечает

1. Проверьте правильность токена в `.env`
2. Убедитесь, что бот запущен
3. Проверьте логи в консоли

### Ошибки с базой данных

1. Убедитесь, что Supabase проект создан
2. Проверьте правильность URL и ключа
3. Убедитесь, что SQL скрипт выполнен
4. Проверьте права доступа в Supabase

### Проблемы с ИИ-генерацией

1. Проверьте правильность DeepSeek API ключа
2. Убедитесь, что у вас есть кредиты на аккаунте DeepSeek
3. Бот будет использовать резервные шаблоны при ошибках
4. Поздравления и идеи подарков ограничены 100 символами

## 📝 Логирование

Бот выводит подробные логи в консоль:
- Обработка сообщений
- Работа с базой данных Supabase
- Отправка напоминаний
- Ошибки и исключения

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Создайте Pull Request

## 📄 Лицензия

MIT License

## 📞 Поддержка

При возникновении проблем создайте Issue в репозитории или обратитесь к разработчику.

---

**Создано с ❤️ для того, чтобы не забывать о важных днях!**