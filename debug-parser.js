import { MessageParser } from './src/messageParser.js';

const parser = new MessageParser();

// Тестируем конкретное сообщение
const testMessage = "Анна, 15.03.1990, сестра";
console.log(`Тестируем: "${testMessage}"`);

// Проверяем регулярные выражения
const patterns = [
    /^(.+?),\s*(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s*,?\s*(.*)$/i,
    /^(.+?)\s+(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s+(.*)$/i,
    /^(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s+(.+?)\s*,?\s*(.*)$/i,
    /^(.+?),\s*(\d{1,2}[.\-/]\d{1,2})\s*,?\s*(.*)$/i,
    /^(.+?)\s+(\d{1,2}[.\-/]\d{1,2})\s+(.*)$/i,
    /^(\d{1,2}[.\-/]\d{1,2})\s+(.+?)\s*,?\s*(.*)$/i
];

patterns.forEach((pattern, index) => {
    const match = testMessage.match(pattern);
    console.log(`Паттерн ${index + 1}: ${match ? '✅ СОВПАДЕНИЕ' : '❌ НЕТ'}`);
    if (match) {
        console.log(`  Группы: [${match[1]}, ${match[2]}, ${match[3]}]`);
    }
});

// Тестируем парсинг даты отдельно
console.log('\nТестируем parseDate:');
const dateStr = "15.03.1990";
console.log(`Дата: "${dateStr}"`);
const parsedDate = parser.parseDate(dateStr);
console.log(`Результат: ${parsedDate ? parsedDate.format('YYYY-MM-DD') : 'null'}`);