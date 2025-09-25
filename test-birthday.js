import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

async function addTestBirthday() {
    console.log('🎂 Добавляем тестовый день рождения на 9 сентября...');
    
    try {
        // Создаем клиент Supabase
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );
        
        // Добавляем тестовый день рождения на 9 сентября
        const { data, error } = await supabase
            .from('birthdays')
            .insert([
                {
                    chat_id: 123456789, // Тестовый chat_id
                    name: 'Тестовый друг',
                    birth_date: '1990-09-09', // 9 сентября
                    info: 'Тестовый пользователь для проверки мгновенного поздравления'
                }
            ])
            .select();
        
        if (error) {
            console.error('❌ Ошибка при добавлении тестового дня рождения:', error.message);
            return;
        }
        
        console.log('✅ Тестовый день рождения добавлен!');
        console.log('📝 ID записи:', data[0].id);
        console.log('👤 Имя:', data[0].name);
        console.log('📅 Дата:', data[0].birth_date);
        console.log('');
        console.log('💡 Теперь отправьте любое сообщение боту, чтобы получить мгновенное поздравление!');
        
    } catch (error) {
        console.error('❌ Неожиданная ошибка:', error.message);
    }
}

// Запускаем добавление тестового дня рождения
addTestBirthday();