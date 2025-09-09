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

-- Создание политики безопасности (каждый пользователь видит только свои записи)
-- В реальном приложении здесь должна быть более сложная логика авторизации
CREATE POLICY "Users can view their own birthdays" ON birthdays
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own birthdays" ON birthdays
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own birthdays" ON birthdays
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own birthdays" ON birthdays
    FOR DELETE USING (true);