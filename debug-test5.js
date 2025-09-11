import { MessageParser } from './src/messageParser.js';

const parser = new MessageParser();

// Тестируем конкретное сообщение
const testMessage = "Ольга, 15.03, мама";
console.log(`Тестируем: "${testMessage}"`);

// Проверяем регулярные выражения
const patterns = [
    /^(.+?),\s*(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s*,?\s*(.*)$/i,
    /^(.+?)\s+(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s+(.*)$/i,
    /^(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s+(.+?)\s*,?\s*(.*)$/i,
    /^(.+?),\s*(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s*$/i,
    /^(.+?)\s+(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s*$/i,
    /^(.+?),\s*([а-яё\s\d]+)\s*,?\s*(.*)$/i,
    /^(.+?)\s+([а-яё\s\d]+)\s+(.*)$/i,
    /^(.+?),\s*(\d{1,2}[.\-/]\d{1,2})\s*,?\s*(.*)$/i,
    /^(.+?)\s+(\d{1,2}[.\-/]\d{1,2})\s+(.*)$/i,
    /^(\d{1,2}[.\-/]\d{1,2})\s+(.+?)\s*,?\s*(.*)$/i,
    /^(.+?),\s*(\d{1,2}[.\-/]\d{1,2})\s*$/i,
    /^(.+?)\s+(\d{1,2}[.\-/]\d{1,2})\s*$/i,
    /^(.+?),\s*([а-яё\s\d]+)\s*$/i,
    /^(.+?)\s+([а-яё\s\d]+)\s*$/i
];

patterns.forEach((pattern, index) => {
    const match = testMessage.match(pattern);
    console.log(`Паттерн ${index + 1}: ${match ? '✅ СОВПАДЕНИЕ' : '❌ НЕТ'}`);
    if (match) {
        console.log(`  Группы: [${match[1]}, ${match[2]}, ${match[3]}]`);
    }
});

// Тестируем полный парсинг
console.log('\n=== Полный парсинг ===');
const result = parser.parseMessage(testMessage);
console.log('Результат:', result);