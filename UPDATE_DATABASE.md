# Обновление базы данных для добавления таблицы пользователей

## Что изменилось

Добавлена новая таблица `users` для хранения информации о пользователях бота:
- ID пользователя в Telegram
- Username (никнейм)
- Имя и фамилия
- Язык
- Время последней активности

## Как обновить базу данных

### 1. Выполните SQL скрипт в Supabase

Откройте Supabase Dashboard → SQL Editor и выполните содержимое файла `supabase/schema_with_users.sql`:

```sql
-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    chat_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    is_bot BOOLEAN DEFAULT FALSE,
    language_code VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Обновление таблицы birthdays с внешним ключом
ALTER TABLE birthdays 
ADD CONSTRAINT fk_birthdays_user 
FOREIGN KEY (chat_id) REFERENCES users(chat_id) ON DELETE CASCADE;

-- Создание функции для upsert пользователей
CREATE OR REPLACE FUNCTION upsert_user(
    p_chat_id BIGINT,
    p_username VARCHAR(255) DEFAULT NULL,
    p_first_name VARCHAR(255) DEFAULT NULL,
    p_last_name VARCHAR(255) DEFAULT NULL,
    p_is_bot BOOLEAN DEFAULT FALSE,
    p_language_code VARCHAR(10) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO users (chat_id, username, first_name, last_name, is_bot, language_code, last_activity)
    VALUES (p_chat_id, p_username, p_first_name, p_last_name, p_is_bot, p_language_code, NOW())
    ON CONFLICT (chat_id) 
    DO UPDATE SET 
        username = COALESCE(EXCLUDED.username, users.username),
        first_name = COALESCE(EXCLUDED.first_name, users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, users.last_name),
        is_bot = COALESCE(EXCLUDED.is_bot, users.is_bot),
        language_code = COALESCE(EXCLUDED.language_code, users.language_code),
        last_activity = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

### 2. Новые возможности

После обновления базы данных бот будет:

- **Автоматически сохранять** информацию о пользователях при каждом сообщении
- **Отслеживать активность** пользователей
- **Показывать статистику** через команду `/stats` или кнопку "📈 Статистика"
- **Отображать топ-5** самых активных пользователей
- **Считать активных** пользователей за последнюю неделю

### 3. Новые команды

- `/stats` - показать статистику пользователей
- Кнопка "📈 Статистика" в главном меню

### 4. Что покажет статистика

- Общее количество пользователей
- Количество активных пользователей за неделю
- Время последней активности
- Топ-5 пользователей по активности

## Важно

- Обновление базы данных **безопасно** - существующие данные не будут потеряны
- Новые функции будут работать только после выполнения SQL скрипта
- Если возникнут ошибки, проверьте права доступа в Supabase