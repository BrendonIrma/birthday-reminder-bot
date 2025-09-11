import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import dotenv from 'dotenv';
import moment from 'moment';
import http from 'http';
import { SupabaseDatabase } from './database.js';
import { MessageParser } from './messageParser.js';
import { BirthdayReminder } from './birthdayReminder.js';
import { AIAssistant } from './aiAssistant.js';

// Загружаем переменные окружения
dotenv.config();

class BirthdayBot {
    constructor() {
        this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
        this.db = new SupabaseDatabase();
        this.messageParser = new MessageParser();
        this.birthdayReminder = new BirthdayReminder(this.bot, this.db);
        this.aiAssistant = new AIAssistant();
        
        this.setupHandlers();
        this.setupCronJobs();
        this.setupHttpServer();
    }

    setupHandlers() {
        // Обработчик всех текстовых сообщений
        this.bot.on('message', async (msg) => {
            if (msg.text) {
                await this.handleMessage(msg);
            }
        });

        // Обработчик команды /start
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const welcomeMessage = `
🎉 Добро пожаловать в бота напоминаний о днях рождения!

Просто отправьте мне сообщение в формате:
"Имя, дата рождения, краткая информация о человеке"

Например:
"Анна, 3 марта, моя сестра, любит книги"
"Петр, 15.05.1990, коллега, программист"

⏰ Я буду напоминать вам о днях рождения каждый день в 09:00 по московскому времени и предложу идеи для поздравлений и подарков! 🎁

💡 Если добавите день рождения на сегодня - сразу получите поздравление!
            `;
            
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '📋 Мои дни рождения', callback_data: 'list' },
                        { text: '📝 Примеры', callback_data: 'example' }
                    ],
                    [
                        { text: '❓ Помощь', callback_data: 'help' },
                        { text: '📊 Статус', callback_data: 'status' }
                    ],
                    [
                        { text: '🧪 Тест напоминаний', callback_data: 'test_reminder' }
                    ]
                ]
            };
            
            await this.bot.sendMessage(chatId, welcomeMessage, { reply_markup: keyboard });
        });

        // Обработчик команды /list
        this.bot.onText(/\/list/, async (msg) => {
            const chatId = msg.chat.id;
            await this.showBirthdayList(chatId);
        });

        // Обработчик команды /help
        this.bot.onText(/\/help/, async (msg) => {
            const chatId = msg.chat.id;
            const helpMessage = `
📋 Доступные команды:

/start - Начать работу с ботом
/list - Показать список всех дней рождения
/format - Подсказка по форматам ввода
/example - Готовые примеры для копирования
/test_reminder - Тестировать систему напоминаний
/status - Показать статус системы
/help - Показать эту справку

💡 Как добавить день рождения:
Отправьте сообщение в формате:
"Имя, дата рождения, краткая информация"

Примеры:
• "Мария, 20 декабря, моя мама"
• "Петр, 03.07.1992, коллега, программист"
• "Елена, 14 февраля, подруга, любит цветы"

📅 Поддерживаемые форматы дат:
• 15.03.1990 (числовой)
• 3 марта (текстовый)
• 15 мая 1990
• марта 3

❌ Неправильно: "20 декабря, Мария, моя мама"
✅ Правильно: "Мария, 20 декабря, моя мама"
            `;
            await this.bot.sendMessage(chatId, helpMessage);
        });

        // Обработчик команды /format
        this.bot.onText(/\/format/, async (msg) => {
            const chatId = msg.chat.id;
            const formatMessage = `
📝 Подробная справка по форматам ввода:

🎯 ОСНОВНОЕ ПРАВИЛО:
Имя должно быть ПЕРВЫМ, затем дата, затем информация

✅ ПРАВИЛЬНЫЕ ФОРМАТЫ:
• "Имя, дата, информация"
• "Имя дата информация" (без запятых)
• "Имя, дата" (без информации)

📅 ФОРМАТЫ ДАТ:

Числовые (с годом):
• 15.03.1990
• 15/03/1990  
• 15-03-1990
• 03.15.1990

Числовые (без года):
• 15.03 (год = текущий)
• 15/03
• 15-03

Текстовые:
• 3 марта
• 3 марта 1990
• марта 3
• марта 3 1990

❌ НЕПРАВИЛЬНО:
• "20 декабря, Мария" (дата перед именем)
• "Мария 20" (неполная дата)
• "20.12 Мария" (дата перед именем)

✅ ПРАВИЛЬНО:
• "Мария, 20 декабря"
• "Мария 20.12.1990"
• "Мария, 3 марта, моя сестра"
            `;
            await this.bot.sendMessage(chatId, formatMessage);
        });

        // Обработчик команды /example
        this.bot.onText(/\/example/, async (msg) => {
            const chatId = msg.chat.id;
            const exampleMessage = `
📋 Готовые примеры для копирования:

👩‍👧‍👦 Семья:
• "Мама, 15 марта, любит цветы"
• "Папа, 20.12.1965, водитель"
• "Бабушка, 3 января, пенсионерка"

👥 Друзья:
• "Анна, 14 февраля, лучшая подруга"
• "Сергей, 25.07.1990, одноклассник"
• "Оля, 8 сентября, коллега"

💼 Работа:
• "Начальник, 10 мая, директор"
• "Коллега, 30.11.1985, программист"
• "Клиент, 22 апреля, предприниматель"

🎂 Дети:
• "Сын, 5 июня, школьник"
• "Дочь, 12.10.2010, любит рисовать"
• "Племянник, 18 августа, студент"

💡 Просто скопируйте любой пример и замените данные!
            `;
            await this.bot.sendMessage(chatId, exampleMessage);
        });

        // Обработчик команды /test_reminder (тестирование системы напоминаний)
        this.bot.onText(/\/test_reminder/, async (msg) => {
            const chatId = msg.chat.id;
            await this.bot.sendMessage(chatId, '🔍 Запускаю тестовую проверку напоминаний...');
            
            try {
                // Запускаем проверку напоминаний вручную
                await this.birthdayReminder.checkAndSendReminders();
                await this.bot.sendMessage(chatId, '✅ Тестовая проверка завершена! Если есть дни рождения на сегодня - вы получили уведомления.');
            } catch (error) {
                console.error('Error in test reminder:', error);
                await this.bot.sendMessage(chatId, '❌ Ошибка при тестировании напоминаний.');
            }
        });

        // Обработчик команды /status (показать статус cron-задач)
        this.bot.onText(/\/status/, async (msg) => {
            const chatId = msg.chat.id;
            await this.showStatus(chatId);
        });

        // Обработчик callback-запросов от inline-кнопок
        this.bot.on('callback_query', async (callbackQuery) => {
            const chatId = callbackQuery.message.chat.id;
            const data = callbackQuery.data;
            const messageId = callbackQuery.message.message_id;

            try {
                switch (data) {
                    case 'list':
                        await this.showBirthdayList(chatId);
                        break;
                    case 'example':
                        await this.showExamples(chatId);
                        break;
                    case 'help':
                        await this.showHelp(chatId);
                        break;
                    case 'status':
                        await this.showStatus(chatId);
                        break;
                    case 'test_reminder':
                        await this.testReminder(chatId);
                        break;
                    case 'format':
                        await this.showFormat(chatId);
                        break;
                    case 'main_menu':
                        await this.showMainMenu(chatId);
                        break;
                    default:
                        await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Неизвестная команда' });
                        return;
                }
                
                // Подтверждаем получение callback
                await this.bot.answerCallbackQuery(callbackQuery.id);
                
            } catch (error) {
                console.error('Error handling callback query:', error);
                await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Произошла ошибка' });
            }
        });
    }

    async handleMessage(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;
        const username = msg.from.username || msg.from.first_name || 'Unknown';

        // Логируем все сообщения от пользователей
        console.log(`📱 Message from @${username} (${chatId}): ${text}`);

        // Пропускаем команды
        if (text.startsWith('/')) {
            return;
        }

        // Сначала проверяем, есть ли сегодня дни рождения у пользователя
        await this.checkTodayBirthdays(chatId);

        try {
            const parsedData = this.messageParser.parseMessage(text);
            
            if (parsedData.error) {
                await this.bot.sendMessage(chatId, `❌ ${parsedData.error}`);
                return;
            }

            // Сохраняем в базу данных
            const birthdayId = await this.db.addBirthday(
                chatId,
                parsedData.name,
                parsedData.date,
                parsedData.info
            );

            if (birthdayId) {
                // Логируем добавление дня рождения
                console.log(`🎂 Added birthday: ${parsedData.name} (${parsedData.originalDate}) for @${username} (${chatId})`);
                
                // Проверяем, является ли добавленный день рождения сегодняшним
                const today = new Date();
                const month = today.getMonth() + 1;
                const day = today.getDate();
                
                const addedBirthday = new Date(parsedData.date);
                const addedMonth = addedBirthday.getMonth() + 1;
                const addedDay = addedBirthday.getDate();
                
                if (month === addedMonth && day === addedDay) {
                    // Если добавленный день рождения сегодня - отправляем мгновенное поздравление
                    console.log(`🎉 Instant birthday notification sent to @${username} for ${parsedData.name}`);
                    await this.sendInstantBirthdayMessage(chatId, {
                        name: parsedData.name,
                        info: parsedData.info || ''
                    });
                } else {
                    // Обычное подтверждение
                    const confirmationMessage = `✅ Отлично! Я запомнил день рождения ${parsedData.name} (${parsedData.originalDate}). Буду напоминать вам об этом! 🎂`;
                    
                    const keyboard = {
                        inline_keyboard: [
                            [
                                { text: '📋 Мои дни рождения', callback_data: 'list' },
                                { text: '🏠 Главное меню', callback_data: 'main_menu' }
                            ]
                        ]
                    };
                    
                    await this.bot.sendMessage(chatId, confirmationMessage, { reply_markup: keyboard });
                }
            } else {
                console.log(`❌ Failed to add birthday for @${username}: ${parsedData.name}`);
                await this.bot.sendMessage(chatId, '❌ Произошла ошибка при сохранении данных.');
            }

        } catch (error) {
            console.error('Error handling message:', error);
            await this.bot.sendMessage(chatId, '❌ Произошла ошибка при обработке сообщения.');
        }
    }

    async checkTodayBirthdays(chatId) {
        try {
            const today = new Date();
            const month = today.getMonth() + 1;
            const day = today.getDate();

            console.log(`Checking today's birthdays for chat ${chatId}: ${day}.${month}`);

            const birthdays = await this.db.getBirthdaysByDate(month, day);
            
            if (birthdays.length === 0) {
                return; // Нет дней рождения сегодня
            }

            // Фильтруем только дни рождения этого пользователя
            const userBirthdays = birthdays.filter(birthday => birthday.chat_id === chatId);
            
            if (userBirthdays.length === 0) {
                return; // У этого пользователя нет дней рождения сегодня
            }

            console.log(`Found ${userBirthdays.length} birthdays today for chat ${chatId}`);

            // Отправляем поздравления для каждого дня рождения
            for (const birthday of userBirthdays) {
                await this.sendInstantBirthdayMessage(chatId, birthday);
            }

        } catch (error) {
            console.error('Error checking today birthdays:', error);
        }
    }

    async sendInstantBirthdayMessage(chatId, birthday) {
        try {
            const name = birthday.name;
            const info = birthday.info || '';

            // Генерируем поздравление и идею подарка
            const congratulations = await this.aiAssistant.generateCongratulations(name, info);
            const giftIdea = await this.aiAssistant.generateGiftIdea(name, info);

            // Создаем объединенное сообщение
            const combinedMessage = this.createCombinedMessage(name, congratulations, giftIdea);
            await this.bot.sendMessage(chatId, combinedMessage);

        } catch (error) {
            console.error('Error sending instant birthday message:', error);
        }
    }

    createCombinedMessage(name, congratulations, giftIdea) {
        let message = `🎉 Сегодня день рождения у ${name}!\n\n`;
        
        // Добавляем поздравление
        if (congratulations) {
            message += `💌 ${congratulations}\n\n`;
        }
        
        // Добавляем идею подарка
        if (giftIdea) {
            message += `🎁 ${giftIdea}`;
        }
        
        // Ограничиваем до 400 символов
        if (message.length > 400) {
            // Если сообщение слишком длинное, сокращаем поздравление и идею подарка
            const baseMessage = `🎉 Сегодня день рождения у ${name}!\n\n`;
            const availableSpace = 400 - baseMessage.length;
            
            let congratulationsText = '';
            let giftIdeaText = '';
            
            if (congratulations && giftIdea) {
                // Распределяем место поровну между поздравлением и идеей подарка
                const spacePerPart = Math.floor(availableSpace / 2) - 10; // 10 символов на эмодзи и переносы
                
                congratulationsText = congratulations.length > spacePerPart 
                    ? congratulations.substring(0, spacePerPart - 3) + '...'
                    : congratulations;
                    
                giftIdeaText = giftIdea.length > spacePerPart 
                    ? giftIdea.substring(0, spacePerPart - 3) + '...'
                    : giftIdea;
                    
                message = `${baseMessage}💌 ${congratulationsText}\n\n🎁 ${giftIdeaText}`;
            } else if (congratulations) {
                congratulationsText = congratulations.length > availableSpace - 5
                    ? congratulations.substring(0, availableSpace - 8) + '...'
                    : congratulations;
                message = `${baseMessage}💌 ${congratulationsText}`;
            } else if (giftIdea) {
                giftIdeaText = giftIdea.length > availableSpace - 5
                    ? giftIdea.substring(0, availableSpace - 8) + '...'
                    : giftIdea;
                message = `${baseMessage}🎁 ${giftIdeaText}`;
            }
        }
        
        return message;
    }

    // Методы для кнопок и команд
    async showMainMenu(chatId) {
        const welcomeMessage = `
🎉 Главное меню бота напоминаний о днях рождения!

Выберите действие с помощью кнопок ниже:
        `;
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '📋 Мои дни рождения', callback_data: 'list' },
                    { text: '📝 Примеры', callback_data: 'example' }
                ],
                [
                    { text: '❓ Помощь', callback_data: 'help' },
                    { text: '📊 Статус', callback_data: 'status' }
                ],
                [
                    { text: '🧪 Тест напоминаний', callback_data: 'test_reminder' }
                ]
            ]
        };
        
        await this.bot.sendMessage(chatId, welcomeMessage, { reply_markup: keyboard });
    }

    async showExamples(chatId) {
        const exampleMessage = `
📋 Готовые примеры для копирования:

👩‍👧‍👦 Семья:
• "Мама, 15 марта, любит цветы"
• "Папа, 20.12.1965, водитель"
• "Бабушка, 3 января, пенсионерка"

👥 Друзья:
• "Анна, 14 февраля, лучшая подруга"
• "Сергей, 25.07.1990, одноклассник"
• "Оля, 8 сентября, коллега"

💼 Работа:
• "Начальник, 10 мая, директор"
• "Коллега, 30.11.1985, программист"
• "Клиент, 22 апреля, предприниматель"

🎂 Дети:
• "Сын, 5 июня, школьник"
• "Дочь, 12.10.2010, любит рисовать"
• "Племянник, 18 августа, студент"

💡 Просто скопируйте любой пример и замените данные!
        `;
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '📝 Подробные форматы', callback_data: 'format' },
                    { text: '🏠 Главное меню', callback_data: 'main_menu' }
                ]
            ]
        };
        
        await this.bot.sendMessage(chatId, exampleMessage, { reply_markup: keyboard });
    }

    async showHelp(chatId) {
        const helpMessage = `
📋 Доступные команды:

/start - Начать работу с ботом
/list - Показать список всех дней рождения
/format - Подсказка по форматам ввода
/example - Готовые примеры для копирования
/test_reminder - Тестировать систему напоминаний
/status - Показать статус системы
/help - Показать эту справку

💡 Как добавить день рождения:
Отправьте сообщение в формате:
"Имя, дата рождения, краткая информация"

Примеры:
• "Мария, 20 декабря, моя мама"
• "Петр, 03.07.1992, коллега, программист"
• "Елена, 14 февраля, подруга, любит цветы"

📅 Поддерживаемые форматы дат:
• 15.03.1990 (числовой)
• 3 марта (текстовый)
• 15 мая 1990
• марта 3

❌ Неправильно: "20 декабря, Мария, моя мама"
✅ Правильно: "Мария, 20 декабря, моя мама"
        `;
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '📝 Подробные форматы', callback_data: 'format' },
                    { text: '📋 Примеры', callback_data: 'example' }
                ],
                [
                    { text: '🏠 Главное меню', callback_data: 'main_menu' }
                ]
            ]
        };
        
        await this.bot.sendMessage(chatId, helpMessage, { reply_markup: keyboard });
    }

    async showFormat(chatId) {
        const formatMessage = `
📝 Подробная справка по форматам ввода:

🎯 ОСНОВНОЕ ПРАВИЛО:
Имя должно быть ПЕРВЫМ, затем дата, затем информация

✅ ПРАВИЛЬНЫЕ ФОРМАТЫ:
• "Имя, дата, информация"
• "Имя дата информация" (без запятых)
• "Имя, дата" (без информации)

📅 ФОРМАТЫ ДАТ:

Числовые (с годом):
• 15.03.1990
• 15/03/1990  
• 15-03-1990
• 03.15.1990

Числовые (без года):
• 15.03 (год = текущий)
• 15/03
• 15-03

Текстовые:
• 3 марта
• 3 марта 1990
• марта 3
• марта 3 1990

❌ НЕПРАВИЛЬНО:
• "20 декабря, Мария" (дата перед именем)
• "Мария 20" (неполная дата)
• "20.12 Мария" (дата перед именем)

✅ ПРАВИЛЬНО:
• "Мария, 20 декабря"
• "Мария 20.12.1990"
• "Мария, 3 марта, моя сестра"
        `;
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '📋 Примеры', callback_data: 'example' },
                    { text: '🏠 Главное меню', callback_data: 'main_menu' }
                ]
            ]
        };
        
        await this.bot.sendMessage(chatId, formatMessage, { reply_markup: keyboard });
    }

    async showStatus(chatId) {
        const now = moment().format('DD.MM.YYYY HH:mm:ss');
        const nextReminder = '09:00 по МСК времени';
        
        const statusMessage = `
📊 Статус системы напоминаний:

⏰ Текущее время: ${now}
🔔 Следующая проверка: ${nextReminder}
🤖 Бот работает: ✅
💾 База данных: ✅

🎯 Система автоматически проверяет дни рождения каждый день в 09:00 по московскому времени.

🧪 Для тестирования используйте команду: /test_reminder
        `;
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '🧪 Тест напоминаний', callback_data: 'test_reminder' },
                    { text: '🏠 Главное меню', callback_data: 'main_menu' }
                ]
            ]
        };
        
        await this.bot.sendMessage(chatId, statusMessage, { reply_markup: keyboard });
    }

    async testReminder(chatId) {
        await this.bot.sendMessage(chatId, '🔍 Запускаю тестовую проверку напоминаний...');
        
        try {
            // Запускаем проверку напоминаний вручную
            await this.birthdayReminder.checkAndSendReminders();
            await this.bot.sendMessage(chatId, '✅ Тестовая проверка завершена! Если есть дни рождения на сегодня - вы получили уведомления.');
        } catch (error) {
            console.error('Error in test reminder:', error);
            await this.bot.sendMessage(chatId, '❌ Ошибка при тестировании напоминаний.');
        }
    }

    async showBirthdayList(chatId) {
        try {
            const birthdays = await this.db.getBirthdaysByChatId(chatId);
            
            if (birthdays.length === 0) {
                const emptyMessage = '📅 У вас пока нет сохраненных дней рождения.';
                const keyboard = {
                    inline_keyboard: [
                        [
                            { text: '📝 Примеры', callback_data: 'example' },
                            { text: '🏠 Главное меню', callback_data: 'main_menu' }
                        ]
                    ]
                };
                await this.bot.sendMessage(chatId, emptyMessage, { reply_markup: keyboard });
                return;
            }

            let message = '📅 Ваши дни рождения:\n\n';
            birthdays.forEach((birthday, index) => {
                const nextBirthday = this.birthdayReminder.getNextBirthday(birthday.birth_date);
                const daysUntil = this.birthdayReminder.getDaysUntilBirthday(nextBirthday);
                
                message += `${index + 1}. ${birthday.name} - ${birthday.birth_date}`;
                if (birthday.info) {
                    message += ` (${birthday.info})`;
                }
                message += `\n   📅 Следующий день рождения: ${nextBirthday.format('DD.MM.YYYY')}`;
                message += `\n   ⏰ Через ${daysUntil} дней\n\n`;
            });

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '🔄 Обновить список', callback_data: 'list' },
                        { text: '🏠 Главное меню', callback_data: 'main_menu' }
                    ]
                ]
            };

            await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });
        } catch (error) {
            console.error('Error showing birthday list:', error);
            await this.bot.sendMessage(chatId, '❌ Ошибка при получении списка дней рождения.');
        }
    }

    setupCronJobs() {
        // Проверяем дни рождения каждый день в 09:00
        cron.schedule('0 9 * * *', async () => {
            console.log('Checking for birthdays...');
            await this.birthdayReminder.checkAndSendReminders();
        });

        console.log('Cron jobs set up successfully');
    }

    setupHttpServer() {
        const port = process.env.PORT || 3000;
        
        const server = http.createServer((req, res) => {
            if (req.url === '/' && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    status: 'ok', 
                    message: 'Birthday Bot is running',
                    timestamp: new Date().toISOString()
                }));
            } else if (req.url === '/health' && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    status: 'healthy',
                    uptime: process.uptime(),
                    timestamp: new Date().toISOString()
                }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        });

        server.listen(port, () => {
            console.log(`HTTP server running on port ${port}`);
        });

        this.httpServer = server;
    }

    setupCronJobs() {
        // Проверяем дни рождения каждый день в 09:00 по московскому времени
        cron.schedule('0 9 * * *', async () => {
            console.log('🔔 Cron: Checking birthdays at 09:00 MSK...');
            await this.birthdayReminder.checkAndSendReminders();
        }, {
            scheduled: true,
            timezone: "Europe/Moscow"
        });
        
        console.log('✅ Cron jobs set up successfully - daily reminders at 09:00 MSK');
    }

    async start() {
        try {
            await this.db.init();
            console.log('Birthday Bot started successfully!');
        } catch (error) {
            console.error('Failed to start bot:', error);
            process.exit(1);
        }
    }
}

// Запускаем бота
const bot = new BirthdayBot();
bot.start();