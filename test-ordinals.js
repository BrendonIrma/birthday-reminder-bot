import dotenv from 'dotenv';
import { MessageParser } from './src/messageParser.js';

dotenv.config();

const parser = new MessageParser();

// Тестируем порядковые числительные
const testMessages = [
    "Анна третьего марта моя сестра",
    "Петр двадцатого декабря коллега"
];

console.log('🧪 Тестирование порядковых числительных\n');

testMessages.forEach((message, index) => {
    console.log(`\n${index + 1}. Сообщение: "${message}"`);
    
    // Разбиваем на слова
    const words = message.split(/\s+/);
    console.log(`   Слова: [${words.join(', ')}]`);
    
    // Проверяем каждое слово
    words.forEach((word, i) => {
        const isDate = parser.isDatePart(word);
        const isName = parser.isNamePart(word);
        console.log(`   Слово ${i}: "${word}" - дата: ${isDate}, имя: ${isName}`);
    });
    
    // Проверяем комбинации
    for (let i = 0; i < words.length - 1; i++) {
        const combined = words[i] + ' ' + words[i + 1];
        const isDate = parser.isDatePart(combined);
        console.log(`   Комбинация ${i}: "${combined}" - дата: ${isDate}`);
    }
    
    const result = parser.parseMessage(message);
    if (result.error) {
        console.log(`   ❌ Ошибка: ${result.error}`);
    } else {
        console.log(`   ✅ Имя: ${result.name}`);
        console.log(`   ✅ Дата: ${result.originalDate}`);
        console.log(`   ✅ Информация: ${result.info || 'не указана'}`);
    }
});

console.log('\n🎉 Тестирование завершено!');