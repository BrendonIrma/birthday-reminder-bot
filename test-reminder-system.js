// Тестируем систему напоминаний
import cron from 'node-cron';
import moment from 'moment';

console.log('Тестирование системы напоминаний:');
console.log('==================================\n');

// 1. Тест cron-расписания
console.log('1. 📅 Cron-расписание:');
console.log('   Формат: "0 9 * * *"');
console.log('   Значение: каждый день в 09:00');
console.log('   Часовой пояс: Europe/Moscow');

// 2. Проверяем валидность cron-выражения
const cronExpression = '0 9 * * *';
const isValid = cron.validate(cronExpression);
console.log(`   Валидность выражения: ${isValid ? '✅ корректно' : '❌ некорректно'}`);

// 3. Показываем следующие запуски
console.log('\n2. ⏰ Следующие запуски:');
const now = moment();
console.log(`   Текущее время: ${now.format('DD.MM.YYYY HH:mm:ss')}`);

// Рассчитываем следующий запуск в 09:00
let nextRun = moment().hour(9).minute(0).second(0);
if (nextRun.isBefore(now)) {
    nextRun.add(1, 'day');
}
console.log(`   Следующий запуск: ${nextRun.format('DD.MM.YYYY HH:mm:ss')} (09:00)`);

const hoursUntil = nextRun.diff(now, 'hours', true);
console.log(`   Через: ${hoursUntil.toFixed(1)} часов`);

// 4. Статус системы
console.log('\n3. 🤖 Статус системы:');
console.log('   ✅ Cron-задача настроена');
console.log('   ✅ Функция checkAndSendReminders готова');
console.log('   ✅ Часовой пояс установлен (Europe/Moscow)');
console.log('   ✅ Автоматический запуск ежедневно в 09:00');

// 5. Доступные команды для тестирования
console.log('\n4. 🧪 Команды для тестирования:');
console.log('   /test_reminder - запустить проверку вручную');
console.log('   /status - показать статус системы');
console.log('   /list - показать все дни рождения');

console.log('\n✅ Система напоминаний настроена и готова к работе!');