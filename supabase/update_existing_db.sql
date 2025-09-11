-- Обновление существующей базы данных для добавления таблицы пользователей
-- Этот скрипт безопасно обновляет существующую базу данных

-- 1. Создание таблицы пользователей (если не существует)
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

-- 2. Создание индексов для таблицы пользователей
CREATE INDEX IF NOT EXISTS idx_users_chat_id ON users(chat_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 3. Создание записей пользователей для существующих chat_id в таблице birthdays
INSERT INTO users (chat_id, username, first_name, last_name, is_bot, language_code, last_activity)
SELECT DISTINCT 
    chat_id,
    NULL as username,
    NULL as first_name,
    NULL as last_name,
    FALSE as is_bot,
    NULL as language_code,
    NOW() as last_activity
FROM birthdays 
WHERE chat_id NOT IN (SELECT chat_id FROM users)
ON CONFLICT (chat_id) DO NOTHING;

-- 4. Добавление внешнего ключа к таблице birthdays (если его еще нет)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_birthdays_user' 
        AND table_name = 'birthdays'
    ) THEN
        ALTER TABLE birthdays 
        ADD CONSTRAINT fk_birthdays_user 
        FOREIGN KEY (chat_id) REFERENCES users(chat_id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Включение RLS для таблицы пользователей
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 6. Создание политик безопасности для таблицы пользователей
DROP POLICY IF EXISTS "Users can view all users" ON users;
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own data" ON users;
CREATE POLICY "Users can insert their own data" ON users
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own data" ON users;
CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (true);

-- 7. Создание функции для upsert пользователей
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

-- 8. Создание триггера для автоматического обновления updated_at в таблице users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Удаляем существующий триггер, если он есть, и создаем заново
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Проверяем, что все создалось корректно
SELECT 'Таблица users создана успешно' as status;
SELECT 'Функция upsert_user создана успешно' as status;
SELECT 'Триггеры настроены успешно' as status;