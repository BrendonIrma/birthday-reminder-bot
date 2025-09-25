import { MessageParser } from './src/messageParser.js';

const parser = new MessageParser();

// Тестовые сообщения
const testMessages = [
    "Анна, 15.03.1990, сестра",
    "Петр 15.03.1990 коллега",
    "Мария, 15/03/1990, подруга",
    "Иван 15-03-1990 друг",
    "Ольга, 15.03, мама",
    "Сергей 15.03 папа",
    "Анна, 3 марта, сестра",
    "Петр 3 марта 1990 коллега"
];

console.log('Тестирование парсера дат:');
console.log('========================');

testMessages.forEach((message, index) => {
    console.log(`\n${index + 1}. "${message}"`);
    const result = parser.parseMessage(message);
    
    if (result.error) {
        console.log(`   ❌ Ошибка: ${result.error}`);
    } else {
        console.log(`   ✅ Имя: ${result.name}`);
        console.log(`   ✅ Дата: ${result.date} (${result.originalDate})`);
        console.log(`   ✅ Информация: ${result.info || 'нет'}`);
    }
});