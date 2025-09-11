// Тестируем новые команды
console.log('Тестирование команд бота:');
console.log('========================\n');

// Симулируем сообщения об ошибках
const testMessages = [
    "20 декабря, Светлана, моя мама", // Неправильный порядок
    "Светлана 20", // Неполная дата
    "20.12 Светлана", // Дата перед именем
    "Светлана, 20 декабря, моя мама" // Правильный формат
];

console.log('Тест сообщений об ошибках:');
console.log('--------------------------\n');

testMessages.forEach((message, index) => {
    console.log(`${index + 1}. "${message}"`);
    
    // Симулируем проверку формата
    if (message.includes(',') && message.split(',')[0].trim().match(/^\d/)) {
        console.log('   ❌ Ошибка: Дата перед именем');
    } else if (message.split(' ').length < 3 && !message.includes(',')) {
        console.log('   ❌ Ошибка: Неполная дата');
    } else if (message.match(/^\d/)) {
        console.log('   ❌ Ошибка: Дата перед именем');
    } else {
        console.log('   ✅ Правильный формат');
    }
    console.log('');
});

console.log('Доступные команды:');
console.log('------------------');
console.log('/start - Начать работу с ботом');
console.log('/list - Показать список всех дней рождения');
console.log('/format - Подсказка по форматам ввода');
console.log('/example - Готовые примеры для копирования');
console.log('/help - Показать справку');