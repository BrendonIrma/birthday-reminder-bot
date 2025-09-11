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

-- Создание таблицы для дней рождения
CREATE TABLE IF NOT EXISTS birthdays (
    id SERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (chat_id) REFERENCES users(chat_id) ON DELETE CASCADE
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_users_chat_id ON users(chat_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
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

-- Создание триггеров для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_birthdays_updated_at 
    BEFORE UPDATE ON birthdays 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Включение Row Level Security (RLS) для безопасности
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE birthdays ENABLE ROW LEVEL SECURITY;

-- Создание политик безопасности для таблицы пользователей
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own data" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (true);

-- Создание политик безопасности для таблицы дней рождения
CREATE POLICY "Users can view their own birthdays" ON birthdays
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own birthdays" ON birthdays
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own birthdays" ON birthdays
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own birthdays" ON birthdays
    FOR DELETE USING (true);

-- Создание функции для создания или обновления пользователя
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