# 🗄️ Настройка Supabase для Birthday Bot

## 1. Создание проекта Supabase

1. Перейдите на [supabase.com](https://supabase.com)
2. Нажмите "Start your project"
3. Войдите в аккаунт или зарегистрируйтесь
4. Нажмите "New Project"
5. Выберите организацию
6. Заполните данные проекта:
   - **Name**: `birthday-bot` (или любое другое имя)
   - **Database Password**: создайте надежный пароль
   - **Region**: выберите ближайший регион
7. Нажмите "Create new project"

## 2. Получение учетных данных

После создания проекта:

1. Перейдите в **Settings** → **API**
2. Скопируйте:
   - **Project URL** (например: `https://your-project.supabase.co`)
   - **anon public** ключ (начинается с `eyJ...`)

## 3. Создание таблицы

1. Перейдите в **SQL Editor**
2. Нажмите "New query"
3. Скопируйте и вставьте содержимое файла `supabase/schema.sql`:

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

-- Создание функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггера для автоматического обновления updated_at
CREATE TRIGGER update_birthdays_updated_at 
    BEFORE UPDATE ON birthdays 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Включение Row Level Security (RLS) для безопасности
ALTER TABLE birthdays ENABLE ROW LEVEL SECURITY;

-- Создание политики безопасности
CREATE POLICY "Users can view their own birthdays" ON birthdays
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own birthdays" ON birthdays
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own birthdays" ON birthdays
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own birthdays" ON birthdays
    FOR DELETE USING (true);
```

4. Нажмите "Run" для выполнения скрипта

## 4. Проверка таблицы

1. Перейдите в **Table Editor**
2. Убедитесь, что таблица `birthdays` создана
3. Проверьте структуру таблицы:
   - `id` (int8, primary key)
   - `chat_id` (int8, not null)
   - `name` (varchar, not null)
   - `birth_date` (date, not null)
   - `info` (text, nullable)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

## 5. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# Telegram Bot Token (получите у @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# DeepSeek API Key (для генерации поздравлений и идей подарков)
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Настройки напоминаний (время в формате cron)
REMINDER_TIME=09:00

# Часовой пояс
TIMEZONE=Europe/Moscow
```

## 6. Тестирование подключения

Запустите бота и проверьте подключение:

```bash
npm start
```

В логах должно появиться:
```
Connected to Supabase successfully
Birthday Bot started successfully!
```

## 7. Проверка работы

1. Отправьте боту команду `/start`
2. Добавьте тестовый день рождения:
   ```
   Тест, 1 января, тестовый пользователь
   ```
3. Проверьте в Supabase Table Editor, что запись появилась
4. Используйте команду `/list` для проверки

## 8. Настройка безопасности (опционально)

### Row Level Security (RLS)

По умолчанию RLS включен, но политики разрешают всем доступ. Для более строгой безопасности:

```sql
-- Удалить существующие политики
DROP POLICY IF EXISTS "Users can view their own birthdays" ON birthdays;
DROP POLICY IF EXISTS "Users can insert their own birthdays" ON birthdays;
DROP POLICY IF EXISTS "Users can update their own birthdays" ON birthdays;
DROP POLICY IF EXISTS "Users can delete their own birthdays" ON birthdays;

-- Создать более строгие политики (если нужно)
-- В данном случае оставляем открытый доступ для простоты
```

### API Keys

- **anon key**: используется в боте (публичный)
- **service_role key**: НЕ используйте в боте (приватный)

## 9. Мониторинг

### Логи Supabase

1. Перейдите в **Logs** → **API**
2. Просматривайте запросы к базе данных
3. Отслеживайте ошибки и производительность

### Метрики

1. Перейдите в **Dashboard**
2. Просматривайте статистику использования
3. Отслеживайте количество запросов

## 10. Резервное копирование

### Автоматические бэкапы

Supabase автоматически создает бэкапы:
- Ежедневные бэкапы (7 дней)
- Еженедельные бэкапы (4 недели)

### Ручной экспорт

```sql
-- Экспорт всех данных
SELECT * FROM birthdays;
```

## Troubleshooting

### Ошибка подключения

```
Error: Invalid API key
```
**Решение**: Проверьте правильность SUPABASE_URL и SUPABASE_ANON_KEY

### Ошибка таблицы

```
Error: relation "birthdays" does not exist
```
**Решение**: Выполните SQL скрипт из `supabase/schema.sql`

### Ошибка прав доступа

```
Error: new row violates row-level security policy
```
**Решение**: Проверьте политики RLS или временно отключите RLS:

```sql
ALTER TABLE birthdays DISABLE ROW LEVEL SECURITY;
```

### Ошибка формата даты

```
Error: invalid input syntax for type date
```
**Решение**: Убедитесь, что даты в формате YYYY-MM-DD

## Полезные ссылки

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)