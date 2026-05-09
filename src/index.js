import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import dotenv from 'dotenv';
import moment from 'moment';
import http from 'http';
import { SupabaseDatabase } from './database.js';
import { MessageParser } from './messageParser.js';
import { BirthdayReminder } from './birthdayReminder.js';
import { AIAssistant } from './aiAssistant.js';
import { SecurityUtils } from './security.js';
import { generateGiftIdeas } from './ai/giftIdeasService.js';
import { buildMarketplaceLinks } from './utils/marketplaceLinks.js';

// Загружаем переменные окружения
dotenv.config();

class BirthdayBot {
    constructor() {
        this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
        this.db = new SupabaseDatabase();
        this.messageParser = new MessageParser();
        this.birthdayReminder = new BirthdayReminder(this.bot, this.db);
        this.aiAssistant = new AIAssistant();
        this.security = new SecurityUtils();

        // Система защиты от спама
        this.userRequests = new Map(); // chatId -> { count, resetTime }
        this.RATE_LIMIT = 10; // максимум запросов в минуту
        this.RATE_WINDOW = 60 * 1000; // окно в миллисекундах (1 минута)
        this.MAX_MESSAGE_LENGTH = 1000; // максимум символов в сообщении
        this.MAX_BIRTHDAYS_PER_USER = 100; // максимум дней рождения на пользователя

        // Система отслеживания отправленных напоминаний
        this.sentReminders = new Map(); // chatId -> { date, sent: boolean }

        // Кэш для пользователей (чтобы не обновлять базу при каждом сообщении)
        this.userCache = new Map(); // chatId -> { lastUpdate, userData }
        this.USER_CACHE_TTL = 5 * 60 * 1000; // 5 минут

        // Кэш для лимитов дней рождения
        this.birthdayCountCache = new Map(); // chatId -> { count, lastUpdate }
        this.BIRTHDAY_CACHE_TTL = 2 * 60 * 1000; // 2 минуты

        // Режим ввода информации о человеке для идей подарков (старый flow)
        this.customGiftInput = new Map(); // chatId -> { name, info }

        // Новый диалоговый flow подбора подарка
        // chatId -> { step: 'relation'|'interests'|'budget', relation, interests, budget }
        this.smartGiftFlow = new Map();

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

            // Очищаем режим редактирования при команде /start
            await this.clearEditingMode(chatId, 'Добро пожаловать в главное меню!');

            // Сохраняем информацию о пользователе
            await this.saveUserInfo(msg.from);
            const welcomeMessage = `
🎉 Добро пожаловать в бота напоминаний о днях рождения!

Просто отправьте мне сообщение в формате:
"Имя, дата рождения, краткая информация о человеке"

Например:
"Анна, 3 марта, моя сестра, любит книги"
"Петр, 15.05.1990, коллега, программист"
"3 марта, Анна, моя сестра" (информацию можно добавлять в любом порядке)

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
                        { text: '🎁 Идеи подарков', callback_data: 'gifts' },
                        { text: '❓ Помощь', callback_data: 'help' }
                    ],
                    [
                        { text: '📊 Статус', callback_data: 'status' },
                        { text: '🧪 Тест напоминаний', callback_data: 'test_reminder' }
                    ],
                    [
                        { text: '⚡ Список команд', callback_data: 'commands' }
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
/edit - Редактировать дни рождения
/delete - Удалить день рождения
/cancel - Отменить режим редактирования
/format - Подсказка по форматам ввода
/example - Готовые примеры для копирования
/test_reminder - Тестировать систему напоминаний
/status - Показать статус системы
/help - Показать эту справку

💡 Как добавить день рождения:
Отправьте сообщение в любом из форматов:
"Имя, дата рождения, краткая информация"
или
"дата рождения, Имя, краткая информация"

Примеры (все варианты работают):
• "Мария, 20 декабря, моя мама"
• "20 декабря, Мария, моя мама"
• "Петр, 03.07.1992, коллега, программист"
• "03.07.1992, Петр, коллега, программист"
• "Елена, 14 февраля, подруга, любит цветы"
• "14 февраля, Елена, подруга, любит цветы"

📅 Поддерживаемые форматы дат:
• 15.03.1990 (числовой)
• 3 марта (текстовый)
• 15 мая 1990
• марта 3

✅ Гибкий порядок: можно начинать с имени или с даты!
            `;
            await this.bot.sendMessage(chatId, helpMessage);
        });

        // Обработчик команды /format
        this.bot.onText(/\/format/, async (msg) => {
            const chatId = msg.chat.id;
            const formatMessage = `
📝 Подробная справка по форматам ввода:

🎯 ГИБКИЙ ФОРМАТ:
Информацию можно добавлять в любом порядке!

✅ ПРАВИЛЬНЫЕ ФОРМАТЫ:
• "Имя, дата, информация"
• "Дата, имя, информация" 
• "Имя дата информация" (без запятых)
• "Дата имя информация" (без запятых)
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

✅ ВСЕ РАБОТАЮТ:
• "Мария, 20 декабря, моя мама"
• "20 декабря, Мария, моя мама"
• "Мария 20.12.1990"
• "20.12.1990 Мария"
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
                await this.checkAndSendRemindersWithTracking();
                await this.bot.sendMessage(chatId, '✅ Тестовая проверка завершена! Если есть дни рождения на сегодня - вы получили уведомления.');
            } catch (error) {
                console.error('Error in test reminder:', error);
                await this.bot.sendMessage(chatId, '❌ Ошибка при тестировании напоминаний.');
            }
        });

        // Обработчик команды /gifts (генерация идей подарков)
        this.bot.onText(/\/gifts/, async (msg) => {
            const chatId = msg.chat.id;
            await this.showGiftIdeasMenu(chatId);
        });

        // Обработчик команды /status (показать статус cron-задач)
        this.bot.onText(/\/status/, async (msg) => {
            const chatId = msg.chat.id;
            await this.showStatus(chatId);
        });

        // Обработчик команды /stats (показать статистику пользователей)
        this.bot.onText(/\/stats/, async (msg) => {
            const chatId = msg.chat.id;
            await this.showStats(chatId);
        });

        // Обработчик команды /edit (редактировать дни рождения)
        this.bot.onText(/\/edit/, async (msg) => {
            const chatId = msg.chat.id;
            await this.showEditMenu(chatId);
        });

        // Обработчик команды /delete (удалить день рождения)
        this.bot.onText(/\/delete/, async (msg) => {
            const chatId = msg.chat.id;
            await this.showDeleteMenu(chatId);
        });

        // Обработчик команды /cancel (отменить режим редактирования)
        this.bot.onText(/\/cancel/, async (msg) => {
            const chatId = msg.chat.id;
            await this.clearEditingMode(chatId, 'Режим редактирования отменен по команде.');

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '📋 Мои дни рождения', callback_data: 'list' },
                        { text: '🏠 Главное меню', callback_data: 'main_menu' }
                    ]
                ]
            };

            await this.bot.sendMessage(chatId, '✅ Режим редактирования отменен. Выберите дальнейшее действие:', { reply_markup: keyboard });
        });

        // Обработчик callback-запросов от inline-кнопок
        this.bot.on('callback_query', async (callbackQuery) => {
            const chatId = callbackQuery.message.chat.id;
            const data = callbackQuery.data;
            const messageId = callbackQuery.message.message_id;
            const username = callbackQuery.from.username || callbackQuery.from.first_name || 'Unknown';

            // Проверяем rate limit для callback запросов
            if (this.isRateLimited(chatId)) {
                this.logSuspiciousActivity(chatId, username, 'CALLBACK_RATE_LIMIT_EXCEEDED', `Callback: ${data}`);
                await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Слишком много запросов!' });
                return;
            }

            // Валидируем callback данные
            if (!this.validateCallbackData(data)) {
                this.logSuspiciousActivity(chatId, username, 'INVALID_CALLBACK_DATA', `Callback: ${data}`);
                await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Неверные данные!' });
                return;
            }

            try {
                switch (data) {
                    case 'list':
                        // Очищаем режим редактирования при просмотре списка
                        await this.clearEditingMode(chatId, 'Переходим к просмотру списка дней рождения.');
                        await this.showBirthdayList(chatId);
                        break;
                    case 'example':
                        // Очищаем режим редактирования при просмотре примеров
                        await this.clearEditingMode(chatId, 'Переходим к просмотру примеров.');
                        await this.showExamples(chatId);
                        break;
                    case 'help':
                        // Очищаем режим редактирования при просмотре помощи
                        await this.clearEditingMode(chatId, 'Переходим к справке.');
                        await this.showHelp(chatId);
                        break;
                    case 'status':
                        // Очищаем режим редактирования при просмотре статуса
                        await this.clearEditingMode(chatId, 'Переходим к просмотру статуса.');
                        await this.showStatus(chatId);
                        break;
                    case 'test_reminder':
                        // Очищаем режим редактирования при тестировании
                        await this.clearEditingMode(chatId, 'Запускаем тест напоминаний.');
                        await this.testReminder(chatId);
                        break;
                    case 'gifts':
                        // Очищаем режим редактирования при просмотре идей подарков
                        await this.clearEditingMode(chatId, 'Переходим к идеям подарков.');
                        this.smartGiftFlow.delete(chatId);
                        await this.showGiftIdeasMenu(chatId);
                        break;
                    case 'gift_smart':
                        // Новый умный flow подбора подарка
                        await this.clearEditingMode(chatId, 'Переходим к подбору подарка.');
                        await this.startSmartGiftFlow(chatId);
                        break;
                    case 'gifts_birthday':
                        await this.generateGiftIdeas(chatId, 'день рождения', '');
                        break;
                    case 'gifts_universal':
                        await this.generateGiftIdeas(chatId, 'универсальный подарок', '');
                        break;
                    case 'gifts_colleague':
                        await this.generateGiftIdeas(chatId, 'коллега', 'работает в офисе');
                        break;
                    case 'gifts_family':
                        await this.generateGiftIdeas(chatId, 'член семьи', 'близкий человек');
                        break;
                    case 'gifts_friend':
                        await this.generateGiftIdeas(chatId, 'друг', 'хороший друг');
                        break;
                    case 'gifts_child':
                        await this.generateGiftIdeas(chatId, 'ребенок', 'маленький ребенок');
                        break;
                    case 'gifts_custom':
                        await this.showCustomGiftInput(chatId);
                        break;
                    case 'format':
                        // Очищаем режим редактирования при просмотре форматов
                        await this.clearEditingMode(chatId, 'Переходим к просмотру форматов.');
                        await this.showFormat(chatId);
                        break;
                    case 'stats':
                        // Очищаем режим редактирования при просмотре статистики
                        await this.clearEditingMode(chatId, 'Переходим к просмотру статистики.');
                        await this.showStats(chatId);
                        break;
                    case 'commands':
                        // Очищаем режим редактирования при просмотре команд
                        await this.clearEditingMode(chatId, 'Переходим к списку команд.');
                        await this.showCommands(chatId);
                        break;
                    case 'edit':
                        // Очищаем режим редактирования при входе в меню редактирования
                        await this.clearEditingMode(chatId, 'Переходим к меню редактирования.');
                        await this.showEditMenu(chatId);
                        break;
                    case 'delete':
                        // Очищаем режим редактирования при входе в меню удаления
                        await this.clearEditingMode(chatId, 'Переходим к меню удаления.');
                        await this.showDeleteMenu(chatId);
                        break;
                    case 'main_menu':
                        // Очищаем режим редактирования при возврате в главное меню
                        await this.clearEditingMode(chatId, 'Возвращаемся в главное меню.');
                        await this.showMainMenu(chatId);
                        break;
                    default:
                        // Обработка редактирования и удаления по ID
                        if (data.startsWith('edit_')) {
                            const birthdayId = data.replace('edit_', '');
                            await this.showEditForm(chatId, birthdayId);
                        } else if (data.startsWith('delete_')) {
                            const birthdayId = data.replace('delete_', '');
                            await this.deleteBirthday(chatId, birthdayId);
                        } else if (data === 'edit') {
                            // Очищаем режим редактирования при возврате к списку редактирования
                            if (this.editingBirthday && this.editingBirthday[chatId]) {
                                delete this.editingBirthday[chatId];
                            }
                            await this.showEditMenu(chatId);
                        } else {
                            await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Неизвестная команда' });
                            return;
                        }
                        break;
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

        // Проверяем, не заблокирован ли пользователь
        if (this.security.isUserBlocked(chatId)) {
            this.security.logSecurityEvent(chatId, username, 'BLOCKED_USER_ATTEMPT', { message: text.substring(0, 100) });
            return;
        }

        // Проверяем на атаки
        const attackCheck = this.security.isAttack(text);
        if (attackCheck.isAttack) {
            this.security.logSecurityEvent(chatId, username, 'ATTACK_DETECTED', attackCheck);
            this.security.blockUser(chatId, `Attack detected: ${attackCheck.type}`);
            await this.bot.sendMessage(chatId, '🚫 Ваш аккаунт заблокирован за подозрительную активность.');
            return;
        }

        // Проверяем rate limit
        if (this.isRateLimited(chatId)) {
            this.logSuspiciousActivity(chatId, username, 'RATE_LIMIT_EXCEEDED', `Message: ${text.substring(0, 100)}`);
            await this.bot.sendMessage(chatId, '⏰ Слишком много запросов! Подождите минуту перед следующим сообщением.');
            return;
        }

        // Санитизируем текст
        const sanitizedText = this.security.sanitizeText(text);

        // Сохраняем/обновляем информацию о пользователе
        await this.saveUserInfo(msg.from);

        // Логируем все сообщения от пользователей
        console.log(`📱 Message from @${username} (${chatId}): ${sanitizedText}`);

        // Быстрая проверка команд - пропускаем без дополнительной обработки
        if (sanitizedText.startsWith('/')) {
            return;
        }

        // Проверяем, находится ли пользователь в режиме редактирования
        if (this.editingBirthday && this.editingBirthday[chatId]) {
            await this.handleEditBirthday(chatId, sanitizedText);
            return;
        }

        // Проверяем новый умный flow подбора подарка
        if (this.smartGiftFlow && this.smartGiftFlow.has(chatId)) {
            await this.handleSmartGiftFlowInput(chatId, sanitizedText);
            return;
        }

        // Проверяем, находится ли пользователь в режиме ввода информации о подарках
        if (this.customGiftInput && this.customGiftInput.has(chatId)) {
            await this.handleCustomGiftInput(chatId, sanitizedText);
            return;
        }

        // Валидируем сообщение только если это не специальные режимы
        const validation = this.validateMessage(text);
        if (!validation.valid) {
            this.logSuspiciousActivity(chatId, username, 'INVALID_MESSAGE', validation.error);
            await this.bot.sendMessage(chatId, validation.error);
            return;
        }

        // Напоминания отправляются только через cron-задачу в 09:00

        try {
            const parsedData = this.messageParser.parseMessage(sanitizedText);

            if (parsedData.error) {
                await this.bot.sendMessage(chatId, `❌ ${parsedData.error}`);
                return;
            }

            // Проверяем лимит дней рождения на пользователя (с кэшированием)
            const birthdayCount = await this.getBirthdayCount(chatId);
            if (birthdayCount >= this.MAX_BIRTHDAYS_PER_USER) {
                this.logSuspiciousActivity(chatId, username, 'BIRTHDAY_LIMIT_EXCEEDED', `Current count: ${birthdayCount}`);
                await this.bot.sendMessage(chatId, `❌ Достигнут лимит дней рождения (${this.MAX_BIRTHDAYS_PER_USER}). Удалите некоторые записи, чтобы добавить новые.`);
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

                // Обновляем кэш количества дней рождения
                const cached = this.birthdayCountCache.get(chatId);
                if (cached) {
                    cached.count += 1;
                    cached.lastUpdate = Date.now();
                    this.birthdayCountCache.set(chatId, cached);
                }

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
                    // Отправляем мгновенное поздравление асинхронно
                    this.sendInstantBirthdayMessage(chatId, {
                        name: parsedData.name,
                        info: parsedData.info || ''
                    }).catch(error => {
                        console.error('Error sending instant birthday message:', error);
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
            const todayString = today.toDateString(); // Получаем строку даты для сравнения

            // Проверяем, были ли уже отправлены напоминания сегодня
            const reminderData = this.sentReminders.get(chatId);
            if (reminderData && reminderData.date === todayString && reminderData.sent) {
                return; // Напоминания уже отправлены сегодня
            }

            const month = today.getMonth() + 1;
            const day = today.getDate();

            console.log(`Checking today's birthdays for chat ${chatId}: ${day}.${month}`);

            const birthdays = await this.db.getBirthdaysByDate(month, day);

            if (birthdays.length === 0) {
                // Отмечаем, что проверка была выполнена, даже если дней рождения нет
                this.sentReminders.set(chatId, { date: todayString, sent: false });
                return; // Нет дней рождения сегодня
            }

            // Фильтруем только дни рождения этого пользователя
            const userBirthdays = birthdays.filter(birthday => birthday.chat_id === chatId);

            if (userBirthdays.length === 0) {
                // Отмечаем, что проверка была выполнена, даже если у пользователя нет дней рождения
                this.sentReminders.set(chatId, { date: todayString, sent: false });
                return; // У этого пользователя нет дней рождения сегодня
            }

            console.log(`Found ${userBirthdays.length} birthdays today for chat ${chatId}`);

            // Отправляем поздравления для каждого дня рождения
            for (const birthday of userBirthdays) {
                await this.sendInstantBirthdayMessage(chatId, birthday);
            }

            // Отмечаем, что напоминания были отправлены сегодня
            this.sentReminders.set(chatId, { date: todayString, sent: true });

        } catch (error) {
            console.error('Error checking today birthdays:', error);
        }
    }

    async sendInstantBirthdayMessage(chatId, birthday) {
        try {
            const name = birthday.name;
            const info = birthday.info || '';

            // Сначала отправляем быстрое сообщение
            const quickMessage = `🎉 Сегодня день рождения у ${name}!\n\n⏳ Поздравление и идеи подарков генерируются...`;
            await this.bot.sendMessage(chatId, quickMessage);

            // Затем асинхронно генерируем персонализированный контент
            this.generateAndSendPersonalizedContent(chatId, name, info).catch(error => {
                console.error('Error generating personalized content:', error);
            });

        } catch (error) {
            console.error('Error sending instant birthday message:', error);
        }
    }

    async generateAndSendPersonalizedContent(chatId, name, info) {
        try {
            // Генерируем поздравление и идеи подарков параллельно
            const [congratulations, giftIdeas] = await Promise.all([
                this.aiAssistant.generateCongratulations(name, info),
                this.aiAssistant.generateMultipleGiftIdeas(name, info, 3)
            ]);

            // Создаем персонализированное сообщение
            const personalizedMessage = this.createCombinedMessage(name, congratulations, giftIdeas);

            // Отправляем персонализированное сообщение
            await this.bot.sendMessage(chatId, personalizedMessage);

        } catch (error) {
            console.error('Error generating personalized content:', error);
            // В случае ошибки отправляем простое сообщение
            await this.bot.sendMessage(chatId, `🎁 Идеи подарков для ${name}:\n🎂 Торт\n🎁 Подарок\n🌸 Цветы`);
        }
    }

    createCombinedMessage(name, congratulations, giftIdeas) {
        let message = '';

        // Добавляем поздравление
        if (congratulations) {
            message += `💌 ${congratulations}`;
        }

        // Добавляем идеи подарков
        if (giftIdeas) {
            if (message) {
                message += '\n\n';
            }
            message += `🎁 Идеи подарков:\n${giftIdeas}`;
        }

        // Ограничиваем до 500 символов (увеличили лимит для нескольких идей)
        if (message.length > 500) {
            // Если сообщение слишком длинное, сокращаем поздравление и идеи подарков
            const availableSpace = 500;

            let congratulationsText = '';
            let giftIdeasText = '';

            if (congratulations && giftIdeas) {
                // Распределяем место: 40% на поздравление, 60% на идеи подарков
                const congratulationsSpace = Math.floor(availableSpace * 0.4) - 10;
                const giftIdeasSpace = Math.floor(availableSpace * 0.6) - 10;

                congratulationsText = congratulations.length > congratulationsSpace
                    ? congratulations.substring(0, congratulationsSpace - 3) + '...'
                    : congratulations;

                giftIdeasText = giftIdeas.length > giftIdeasSpace
                    ? giftIdeas.substring(0, giftIdeasSpace - 3) + '...'
                    : giftIdeas;

                message = `💌 ${congratulationsText}\n\n🎁 Идеи подарков:\n${giftIdeasText}`;
            } else if (congratulations) {
                congratulationsText = congratulations.length > availableSpace - 5
                    ? congratulations.substring(0, availableSpace - 8) + '...'
                    : congratulations;
                message = `💌 ${congratulationsText}`;
            } else if (giftIdeas) {
                giftIdeasText = giftIdeas.length > availableSpace - 5
                    ? giftIdeas.substring(0, availableSpace - 8) + '...'
                    : giftIdeas;
                message = `🎁 Идеи подарков:\n${giftIdeasText}`;
            }
        }

        return message;
    }

    // Метод для получения количества дней рождения с кэшированием
    async getBirthdayCount(chatId) {
        try {
            const now = Date.now();
            const cached = this.birthdayCountCache.get(chatId);

            if (cached && (now - cached.lastUpdate) < this.BIRTHDAY_CACHE_TTL) {
                return cached.count;
            }

            const userBirthdays = await this.db.getBirthdaysByChatId(chatId);
            const count = userBirthdays.length;

            // Обновляем кэш
            this.birthdayCountCache.set(chatId, {
                count: count,
                lastUpdate: now
            });

            return count;
        } catch (error) {
            console.error('Error getting birthday count:', error);
            return 0;
        }
    }

    // Метод для сохранения информации о пользователе с кэшированием
    async saveUserInfo(user) {
        try {
            const chatId = user.id;
            const now = Date.now();

            // Проверяем кэш
            const cached = this.userCache.get(chatId);
            if (cached && (now - cached.lastUpdate) < this.USER_CACHE_TTL) {
                // Обновляем только активность, если пользователь в кэше
                this.db.updateUserActivity(chatId).catch(error => {
                    console.error('Error updating user activity:', error);
                });
                return;
            }

            const username = user.username || null;
            const firstName = user.first_name || null;
            const lastName = user.last_name || null;
            const isBot = user.is_bot || false;
            const languageCode = user.language_code || null;

            // Сохраняем в базу данных
            await this.db.upsertUser(chatId, username, firstName, lastName, isBot, languageCode);
            await this.db.updateUserActivity(chatId);

            // Обновляем кэш
            this.userCache.set(chatId, {
                lastUpdate: now,
                userData: { username, firstName, lastName, isBot, languageCode }
            });

        } catch (error) {
            console.error('Error saving user info:', error);
        }
    }

    async handleEditBirthday(chatId, text) {
        try {
            const birthdayId = this.editingBirthday[chatId];

            const parsedData = this.messageParser.parseMessage(text);

            if (parsedData.error) {
                const errorMessage = `❌ ${parsedData.error}\n\n💡 Попробуйте еще раз или используйте кнопки для выхода из режима редактирования.`;

                const keyboard = {
                    inline_keyboard: [
                        [
                            { text: '⬅️ Назад к списку', callback_data: 'edit' },
                            { text: '❌ Отмена', callback_data: 'main_menu' }
                        ],
                        [
                            { text: '📋 Мои дни рождения', callback_data: 'list' },
                            { text: '🏠 Главное меню', callback_data: 'main_menu' }
                        ]
                    ]
                };

                await this.bot.sendMessage(chatId, errorMessage, { reply_markup: keyboard });
                return;
            }

            // Обновляем день рождения
            const updated = await this.db.updateBirthday(
                birthdayId,
                parsedData.name,
                parsedData.date,
                parsedData.info
            );

            if (updated > 0) {
                const message = `✅ День рождения успешно обновлен!\n\n👤 Имя: ${parsedData.name}\n📅 Дата: ${new Date(parsedData.date).toLocaleDateString('ru-RU')}\nℹ️ Информация: ${parsedData.info || 'Не указана'}\n\n🔄 Режим редактирования завершен. Вы можете добавить новые дни рождения или редактировать существующие.`;

                const keyboard = {
                    inline_keyboard: [
                        [
                            { text: '📋 Мои дни рождения', callback_data: 'list' },
                            { text: '✏️ Редактировать еще', callback_data: 'edit' }
                        ],
                        [
                            { text: '🏠 Главное меню', callback_data: 'main_menu' }
                        ]
                    ]
                };

                await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });

                // Очищаем режим редактирования
                delete this.editingBirthday[chatId];
            } else {
                const errorMessage = `❌ Ошибка при обновлении дня рождения.\n\n💡 Попробуйте еще раз или используйте кнопки для выхода из режима редактирования.`;

                const keyboard = {
                    inline_keyboard: [
                        [
                            { text: '⬅️ Назад к списку', callback_data: 'edit' },
                            { text: '❌ Отмена', callback_data: 'main_menu' }
                        ],
                        [
                            { text: '📋 Мои дни рождения', callback_data: 'list' },
                            { text: '🏠 Главное меню', callback_data: 'main_menu' }
                        ]
                    ]
                };

                await this.bot.sendMessage(chatId, errorMessage, { reply_markup: keyboard });
            }
        } catch (error) {
            console.error('Error handling edit birthday:', error);
            await this.bot.sendMessage(chatId, '❌ Ошибка при редактировании дня рождения.');
        }
    }

    // Метод для очистки режима редактирования с уведомлением
    async clearEditingMode(chatId, reason = '') {
        if (this.editingBirthday && this.editingBirthday[chatId]) {
            delete this.editingBirthday[chatId];
            if (reason) {
                await this.bot.sendMessage(chatId, `🔄 Режим редактирования отменен. ${reason}`);
            }
        }

        // Также очищаем режим ввода информации о подарках
        if (this.customGiftInput && this.customGiftInput.has(chatId)) {
            this.customGiftInput.delete(chatId);
        }

        // Очищаем умный flow подбора подарка
        if (this.smartGiftFlow && this.smartGiftFlow.has(chatId)) {
            this.smartGiftFlow.delete(chatId);
        }
    }

    // Метод для проверки rate limit
    isRateLimited(chatId) {
        const now = Date.now();
        const userData = this.userRequests.get(chatId);

        if (!userData) {
            this.userRequests.set(chatId, { count: 1, resetTime: now + this.RATE_WINDOW });
            return false;
        }

        // Если окно истекло, сбрасываем счетчик
        if (now > userData.resetTime) {
            this.userRequests.set(chatId, { count: 1, resetTime: now + this.RATE_WINDOW });
            return false;
        }

        // Если превышен лимит
        if (userData.count >= this.RATE_LIMIT) {
            return true;
        }

        // Увеличиваем счетчик
        userData.count++;
        this.userRequests.set(chatId, userData);
        return false;
    }

    // Метод для валидации сообщения
    validateMessage(text) {
        // Проверка длины сообщения
        if (text.length > this.MAX_MESSAGE_LENGTH) {
            return {
                valid: false,
                error: `❌ Сообщение слишком длинное (максимум ${this.MAX_MESSAGE_LENGTH} символов).`
            };
        }

        // Проверка на подозрительные символы
        const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /eval\s*\(/i,
            /function\s*\(/i
        ];

        for (const pattern of suspiciousPatterns) {
            if (pattern.test(text)) {
                return {
                    valid: false,
                    error: '❌ Сообщение содержит подозрительные символы.'
                };
            }
        }

        // Проверка на повторяющиеся символы (защита от спама)
        const repeatedChars = /(.)\1{20,}/;
        if (repeatedChars.test(text)) {
            return {
                valid: false,
                error: '❌ Сообщение содержит слишком много повторяющихся символов.'
            };
        }

        return { valid: true };
    }

    // Метод для санитизации данных
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;

        return input
            .replace(/[<>\"'&]/g, '') // Удаляем потенциально опасные символы
            .replace(/\s+/g, ' ') // Нормализуем пробелы
            .trim()
            .substring(0, this.MAX_MESSAGE_LENGTH); // Ограничиваем длину
    }

    // Метод для логирования подозрительной активности
    logSuspiciousActivity(chatId, username, activity, details = '') {
        const timestamp = new Date().toISOString();
        console.log(`🚨 SUSPICIOUS ACTIVITY [${timestamp}]`);
        console.log(`   Chat ID: ${chatId}`);
        console.log(`   Username: @${username || 'unknown'}`);
        console.log(`   Activity: ${activity}`);
        console.log(`   Details: ${details}`);
        console.log('---');
    }

    // Метод для валидации callback данных
    validateCallbackData(data) {
        // Разрешенные callback данные
        const allowedCallbacks = [
            'list', 'example', 'help', 'status', 'test_reminder', 'format',
            'stats', 'edit', 'delete', 'main_menu', 'gifts', 'commands',
            'gifts_birthday', 'gifts_universal', 'gifts_colleague',
            'gifts_family', 'gifts_friend', 'gifts_child', 'gifts_custom',
            'gift_smart',
        ];

        // Проверяем, что это разрешенный callback
        if (allowedCallbacks.includes(data)) {
            return true;
        }

        // Проверяем паттерны для edit_ и delete_
        if (data.startsWith('edit_') || data.startsWith('delete_')) {
            const id = data.replace(/^(edit_|delete_)/, '');
            // Проверяем, что ID содержит только цифры
            return /^\d+$/.test(id);
        }

        return false;
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
                    { text: '🎁 Идеи подарков', callback_data: 'gifts' },
                    { text: '✏️ Редактировать', callback_data: 'edit' }
                ],
                [
                    { text: '🗑️ Удалить', callback_data: 'delete' },
                    { text: '❓ Помощь', callback_data: 'help' }
                ],
                [
                    { text: '📊 Статус', callback_data: 'status' },
                    { text: '📈 Статистика', callback_data: 'stats' }
                ],
                [
                    { text: '🧪 Тест напоминаний', callback_data: 'test_reminder' },
                    { text: '⚡ Список команд', callback_data: 'commands' }
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
/list - Показать список всех дней рождения (отсортированы по дате)
/edit - Редактировать дни рождения
/delete - Удалить день рождения
/gifts - Генератор идей подарков
/cancel - Отменить режим редактирования
/format - Подсказка по форматам ввода
/example - Готовые примеры для копирования
/test_reminder - Тестировать систему напоминаний
/status - Показать статус системы
/help - Показать эту справку

💡 Как добавить день рождения:
Отправьте сообщение в любом из форматов:
"Имя, дата рождения, краткая информация"
или
"дата рождения, Имя, краткая информация"

Примеры (все варианты работают):
• "Мария, 20 декабря, моя мама"
• "20 декабря, Мария, моя мама"
• "Петр, 03.07.1992, коллега, программист"
• "03.07.1992, Петр, коллега, программист"
• "Елена, 14 февраля, подруга, любит цветы"
• "14 февраля, Елена, подруга, любит цветы"

📅 Поддерживаемые форматы дат:
• 15.03.1990 (числовой)
• 3 марта (текстовый)
• 15 мая 1990
• марта 3

🎁 Новые возможности:
• Несколько идей подарков в напоминаниях
• Генератор идей подарков по категориям
• Сортировка дней рождения по дате
• Гибкий порядок ввода данных
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

🎯 ГИБКИЙ ФОРМАТ:
Информацию можно добавлять в любом порядке!

✅ ПРАВИЛЬНЫЕ ФОРМАТЫ:
• "Имя, дата, информация"
• "Дата, имя, информация" 
• "Имя дата информация" (без запятых)
• "Дата имя информация" (без запятых)
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

✅ ВСЕ РАБОТАЮТ:
• "Мария, 20 декабря, моя мама"
• "20 декабря, Мария, моя мама"
• "Мария 20.12.1990"
• "20.12.1990 Мария"
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
            await this.checkAndSendRemindersWithTracking();
            await this.bot.sendMessage(chatId, '✅ Тестовая проверка завершена! Если есть дни рождения на сегодня - вы получили уведомления.');
        } catch (error) {
            console.error('Error in test reminder:', error);
            await this.bot.sendMessage(chatId, '❌ Ошибка при тестировании напоминаний.');
        }
    }

    async showStats(chatId) {
        try {
            const users = await this.db.getAllUsers();
            const totalUsers = users.length;
            const activeUsers = users.filter(user => {
                const lastActivity = new Date(user.last_activity);
                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return lastActivity > oneWeekAgo;
            }).length;

            const statsMessage = `
📊 Статистика пользователей:

👥 Всего пользователей: ${totalUsers}
🟢 Активных за неделю: ${activeUsers}
📅 Последняя активность: ${users.length > 0 ? new Date(users[0].last_activity).toLocaleString('ru-RU') : 'Нет данных'}

🔝 Топ-5 пользователей по активности:
${users.slice(0, 5).map((user, index) => {
                const name = user.username ? `@${user.username}` : user.first_name || `ID: ${user.chat_id}`;
                const lastActivity = new Date(user.last_activity).toLocaleDateString('ru-RU');
                return `${index + 1}. ${name} (${lastActivity})`;
            }).join('\n')}

💡 Активными считаются пользователи, которые использовали бота в течение последней недели.
            `;

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '🔄 Обновить статистику', callback_data: 'stats' },
                        { text: '🏠 Главное меню', callback_data: 'main_menu' }
                    ]
                ]
            };

            await this.bot.sendMessage(chatId, statsMessage, { reply_markup: keyboard });
        } catch (error) {
            console.error('Error showing stats:', error);
            await this.bot.sendMessage(chatId, '❌ Ошибка при получении статистики.');
        }
    }

    async showCommands(chatId) {
        const commandsMessage = `
⚡ Список команд бота:

🔧 ОСНОВНЫЕ КОМАНДЫ:
/start - Начать работу с ботом
/list - Показать список всех дней рождения
/help - Показать справку по использованию

✏️ РЕДАКТИРОВАНИЕ:
/edit - Редактировать дни рождения
/delete - Удалить день рождения
/cancel - Отменить режим редактирования

📝 ИНФОРМАЦИЯ:
/format - Подсказка по форматам ввода
/example - Готовые примеры для копирования
/commands - Показать этот список команд

🎁 ДОПОЛНИТЕЛЬНО:
/gifts - Генератор идей подарков
/status - Показать статус системы
/test_reminder - Тестировать систему напоминаний
/stats - Показать статистику пользователей

💡 СОВЕТ:
Используйте кнопку "⚡ Список команд" выше или начните печатать "/" для автодополнения (если настроено в BotFather)
        `;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '📋 Мои дни рождения', callback_data: 'list' },
                    { text: '❓ Помощь', callback_data: 'help' }
                ],
                [
                    { text: '📝 Примеры', callback_data: 'example' },
                    { text: '🏠 Главное меню', callback_data: 'main_menu' }
                ]
            ]
        };

        await this.bot.sendMessage(chatId, commandsMessage, { reply_markup: keyboard });
    }

    async showEditMenu(chatId) {
        try {
            const birthdays = await this.db.getBirthdaysByChatId(chatId);

            if (birthdays.length === 0) {
                const emptyMessage = '📅 У вас пока нет сохраненных дней рождения для редактирования.';
                const keyboard = {
                    inline_keyboard: [
                        [
                            { text: '📝 Добавить день рождения', callback_data: 'example' },
                            { text: '🏠 Главное меню', callback_data: 'main_menu' }
                        ]
                    ]
                };
                await this.bot.sendMessage(chatId, emptyMessage, { reply_markup: keyboard });
                return;
            }

            let message = '✏️ Выберите день рождения для редактирования:\n\n';
            const keyboard = {
                inline_keyboard: []
            };

            birthdays.forEach((birthday, index) => {
                const date = new Date(birthday.birth_date).toLocaleDateString('ru-RU');
                const info = birthday.info ? ` (${birthday.info})` : '';
                message += `${index + 1}. ${birthday.name} - ${date}${info}\n`;

                keyboard.inline_keyboard.push([
                    {
                        text: `✏️ ${birthday.name}`,
                        callback_data: `edit_${birthday.id}`
                    }
                ]);
            });

            keyboard.inline_keyboard.push([
                { text: '🏠 Главное меню', callback_data: 'main_menu' }
            ]);

            await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });
        } catch (error) {
            console.error('Error showing edit menu:', error);
            await this.bot.sendMessage(chatId, '❌ Ошибка при загрузке списка для редактирования.');
        }
    }

    async showDeleteMenu(chatId) {
        try {
            const birthdays = await this.db.getBirthdaysByChatId(chatId);

            if (birthdays.length === 0) {
                const emptyMessage = '📅 У вас пока нет сохраненных дней рождения для удаления.';
                const keyboard = {
                    inline_keyboard: [
                        [
                            { text: '📝 Добавить день рождения', callback_data: 'example' },
                            { text: '🏠 Главное меню', callback_data: 'main_menu' }
                        ]
                    ]
                };
                await this.bot.sendMessage(chatId, emptyMessage, { reply_markup: keyboard });
                return;
            }

            let message = '🗑️ Выберите день рождения для удаления:\n\n';
            const keyboard = {
                inline_keyboard: []
            };

            birthdays.forEach((birthday, index) => {
                const date = new Date(birthday.birth_date).toLocaleDateString('ru-RU');
                const info = birthday.info ? ` (${birthday.info})` : '';
                message += `${index + 1}. ${birthday.name} - ${date}${info}\n`;

                keyboard.inline_keyboard.push([
                    {
                        text: `🗑️ ${birthday.name}`,
                        callback_data: `delete_${birthday.id}`
                    }
                ]);
            });

            keyboard.inline_keyboard.push([
                { text: '🏠 Главное меню', callback_data: 'main_menu' }
            ]);

            await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });
        } catch (error) {
            console.error('Error showing delete menu:', error);
            await this.bot.sendMessage(chatId, '❌ Ошибка при загрузке списка для удаления.');
        }
    }

    async showEditForm(chatId, birthdayId) {
        try {
            const birthday = await this.db.getBirthdayById(birthdayId);

            if (!birthday) {
                await this.bot.sendMessage(chatId, '❌ День рождения не найден.');
                return;
            }

            const date = new Date(birthday.birth_date).toLocaleDateString('ru-RU');
            const message = `
✏️ Редактирование дня рождения:

👤 Имя: ${birthday.name}
📅 Дата: ${date}
ℹ️ Информация: ${birthday.info || 'Не указана'}

📝 Для изменения отправьте новое сообщение в формате:
"Новое имя, новая дата, новая информация"

💡 Пример:
"${birthday.name}, 15 марта 1990, обновленная информация"

⏰ Режим редактирования активен 5 минут, затем автоматически отключится.

🔄 Для выхода из режима редактирования используйте кнопки ниже или любую команду.
            `;

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '⬅️ Назад к списку', callback_data: 'edit' },
                        { text: '❌ Отмена', callback_data: 'main_menu' }
                    ],
                    [
                        { text: '📋 Мои дни рождения', callback_data: 'list' },
                        { text: '🏠 Главное меню', callback_data: 'main_menu' }
                    ]
                ]
            };

            await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });

            // Сохраняем ID для редактирования в сессии пользователя
            this.editingBirthday = this.editingBirthday || {};
            this.editingBirthday[chatId] = birthdayId;

            // Устанавливаем таймаут для автоматического выхода из режима редактирования (5 минут)
            setTimeout(() => {
                if (this.editingBirthday && this.editingBirthday[chatId]) {
                    delete this.editingBirthday[chatId];
                    this.bot.sendMessage(chatId, '⏰ Режим редактирования автоматически отключен. Для повторного редактирования используйте команду /edit');
                }
            }, 5 * 60 * 1000); // 5 минут
        } catch (error) {
            console.error('Error showing edit form:', error);
            await this.bot.sendMessage(chatId, '❌ Ошибка при загрузке формы редактирования.');
        }
    }

    async deleteBirthday(chatId, birthdayId) {
        try {
            const birthday = await this.db.getBirthdayById(birthdayId);

            if (!birthday) {
                await this.bot.sendMessage(chatId, '❌ День рождения не найден.');
                return;
            }

            const success = await this.db.deleteBirthday(birthdayId);

            if (success) {
                const date = new Date(birthday.birth_date).toLocaleDateString('ru-RU');
                const message = `✅ День рождения "${birthday.name}" (${date}) успешно удален.`;

                const keyboard = {
                    inline_keyboard: [
                        [
                            { text: '📋 Мои дни рождения', callback_data: 'list' },
                            { text: '🏠 Главное меню', callback_data: 'main_menu' }
                        ]
                    ]
                };

                await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });
            } else {
                await this.bot.sendMessage(chatId, '❌ Ошибка при удалении дня рождения.');
            }
        } catch (error) {
            console.error('Error deleting birthday:', error);
            await this.bot.sendMessage(chatId, '❌ Ошибка при удалении дня рождения.');
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

            // Сортируем дни рождения по дате следующего дня рождения
            const sortedBirthdays = birthdays.map(birthday => {
                const nextBirthday = this.birthdayReminder.getNextBirthday(birthday.birth_date);
                const daysUntil = this.birthdayReminder.getDaysUntilBirthday(nextBirthday);
                return {
                    ...birthday,
                    nextBirthday,
                    daysUntil
                };
            }).sort((a, b) => {
                // Сортируем по дате следующего дня рождения (timestamp)
                return a.nextBirthday.valueOf() - b.nextBirthday.valueOf();
            });

            let message = '📅 Ваши дни рождения (отсортированы по дате):\n\n';
            sortedBirthdays.forEach((birthday, index) => {
                message += `${index + 1}. ${birthday.name} - ${birthday.birth_date}`;
                if (birthday.info) {
                    message += ` (${birthday.info})`;
                }
                message += `\n   📅 Следующий день рождения: ${birthday.nextBirthday.format('DD.MM.YYYY')}\n\n`;
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

    async showGiftIdeasMenu(chatId) {
        const message = [
            '🎁 <b>Генератор идей подарков</b>',
            '',
            '💡 Я подберу идеи и дам ссылки на поиск в Ozon, WB и Я.Маркет.',
            '',
            'Выберите способ подбора:',
        ].join('\n');

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '🎯 Подобрать умно (3 вопроса)', callback_data: 'gift_smart' },
                ],
                [
                    { text: '🎂 Для дня рождения', callback_data: 'gifts_birthday' },
                    { text: '🎈 Универсально', callback_data: 'gifts_universal' }
                ],
                [
                    { text: '👨‍💼 Коллеге', callback_data: 'gifts_colleague' },
                    { text: '👨‍👩‍👧‍👦 Семье', callback_data: 'gifts_family' }
                ],
                [
                    { text: '👫 Другу/подруге', callback_data: 'gifts_friend' },
                    { text: '👶 Ребёнку', callback_data: 'gifts_child' }
                ],
                [
                    { text: '✏️ Свой вариант', callback_data: 'gifts_custom' }
                ],
                [
                    { text: '🏠 Главное меню', callback_data: 'main_menu' }
                ]
            ]
        };

        await this.bot.sendMessage(chatId, message, { reply_markup: keyboard, parse_mode: 'HTML' });
    }

    async generateGiftIdeas(chatId, occasion, info) {
        try {
            await this.bot.sendMessage(chatId, '⏳ Генерирую идеи подарков...');

            // Используем новый giftIdeasService для получения идей
            const ideas = await generateGiftIdeas({
                relation: occasion,
                interests: info,
                age: '',
                budget: '',
            });

            await this.sendGiftIdeasWithMarketplace(chatId, ideas);

        } catch (error) {
            console.error('Error generating gift ideas:', error);
            await this.bot.sendMessage(chatId, '❌ Ошибка при генерации идей подарков.');
        }
    }

    /**
     * Sends each gift idea as a separate message with marketplace buttons.
     * @param {number|string} chatId
     * @param {string[]} ideas
     */
    async sendGiftIdeasWithMarketplace(chatId, ideas) {
        const header = [
            '🎁 <b>Идеи подарков:</b>',
            '',
            ideas.map((idea, i) => `${i + 1}. ${idea}`).join('\n'),
            '',
            '👇 Нажмите на кнопки под каждой идеей, чтобы найти товар:',
        ].join('\n');

        await this.bot.sendMessage(chatId, header, { parse_mode: 'HTML' });

        for (const idea of ideas) {
            const links = buildMarketplaceLinks(idea);
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '🛒 Ozon', url: links.ozon },
                        { text: '🟣 WB', url: links.wb },
                        { text: '🟡 Я.Маркет', url: links.market },
                    ],
                ],
            };
            await this.bot.sendMessage(chatId, `🔍 <b>${idea}</b>`, {
                parse_mode: 'HTML',
                reply_markup: keyboard,
            });
        }

        const nav = {
            inline_keyboard: [
                [
                    { text: '🔄 Другие идеи', callback_data: 'gifts' },
                    { text: '🏠 Главное меню', callback_data: 'main_menu' },
                ],
            ],
        };
        await this.bot.sendMessage(chatId, '✅ Вот и все идеи! Хотите ещё?', { reply_markup: nav });
    }

    async showCustomGiftInput(chatId) {
        const message = `
✏️ Введите информацию о человеке для генерации персонализированных идей подарков

📝 Формат: Имя, дополнительная информация

Примеры:
• "Анна, моя сестра, любит рисовать"
• "Сергей, коллега, программист, увлекается спортом"
• "Мама, 55 лет, любит цветы и книги"

💡 Чем больше информации вы предоставите, тем лучше будут идеи подарков!
        `;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '❌ Отмена', callback_data: 'gifts' }
                ]
            ]
        };

        // Устанавливаем режим ввода информации о подарках
        this.customGiftInput.set(chatId, { step: 'name' });

        await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });
    }

    async handleCustomGiftInput(chatId, text) {
        try {
            const inputData = this.customGiftInput.get(chatId);

            if (!inputData) {
                this.customGiftInput.delete(chatId);
                return;
            }

            // Парсим введенную информацию
            const parts = text.split(',').map(part => part.trim());
            const name = parts[0];
            const info = parts.slice(1).join(', ');

            if (!name || name.length < 2) {
                await this.bot.sendMessage(chatId, '❌ Пожалуйста, введите имя человека (минимум 2 символа).');
                return;
            }

            await this.bot.sendMessage(chatId, `⏳ Генерирую персонализированные идеи подарков для ${name}...`);

            const ideas = await generateGiftIdeas({
                relation: name,
                interests: info,
                age: '',
                budget: '',
            });

            // Очищаем режим ввода до отправки (чтобы следующие сообщения не попали в режим)
            this.customGiftInput.delete(chatId);

            await this.sendGiftIdeasWithMarketplace(chatId, ideas);

        } catch (error) {
            console.error('Error handling custom gift input:', error);
            await this.bot.sendMessage(chatId, '❌ Ошибка при генерации идей подарков.');
            this.customGiftInput.delete(chatId);
        }
    }

    // ── Умный диалоговый flow подбора подарка ─────────────────────────────────

    async startSmartGiftFlow(chatId) {
        this.smartGiftFlow.set(chatId, { step: 'relation' });

        const keyboard = {
            inline_keyboard: [
                [{ text: '❌ Отмена', callback_data: 'gifts' }],
            ],
        };

        await this.bot.sendMessage(
            chatId,
            '🎯 <b>Умный подбор подарка</b>\n\n👤 <b>Шаг 1 из 3.</b> Кто этот человек?\n\n<i>Например: мама, друг, коллега, жена</i>',
            { parse_mode: 'HTML', reply_markup: keyboard }
        );
    }

    async handleSmartGiftFlowInput(chatId, text) {
        const state = this.smartGiftFlow.get(chatId);
        if (!state) return;

        const cancelKeyboard = {
            inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'gifts' }]],
        };

        try {
            switch (state.step) {
                case 'relation': {
                    state.relation = text.trim();
                    state.step = 'interests';
                    this.smartGiftFlow.set(chatId, state);
                    await this.bot.sendMessage(
                        chatId,
                        '🎯 <b>Умный подбор подарка</b>\n\n💡 <b>Шаг 2 из 3.</b> Какие у него интересы и хобби?\n\n<i>Например: кофе, книги, спорт, путешествия</i>',
                        { parse_mode: 'HTML', reply_markup: cancelKeyboard }
                    );
                    break;
                }
                case 'interests': {
                    state.interests = text.trim();
                    state.step = 'budget';
                    this.smartGiftFlow.set(chatId, state);
                    await this.bot.sendMessage(
                        chatId,
                        '🎯 <b>Умный подбор подарка</b>\n\n💰 <b>Шаг 3 из 3.</b> Какой бюджет?\n\n<i>Например: до 1000 руб, 3000-5000 руб, без ограничений</i>',
                        { parse_mode: 'HTML', reply_markup: cancelKeyboard }
                    );
                    break;
                }
                case 'budget': {
                    state.budget = text.trim();
                    this.smartGiftFlow.delete(chatId);

                    await this.bot.sendMessage(chatId, '⏳ Подбираю идеи подарков...');

                    const ideas = await generateGiftIdeas({
                        relation: state.relation,
                        interests: state.interests,
                        budget: state.budget,
                        age: '',
                    });

                    await this.sendGiftIdeasWithMarketplace(chatId, ideas);
                    break;
                }
                default:
                    this.smartGiftFlow.delete(chatId);
            }
        } catch (error) {
            console.error('[smartGiftFlow] Error:', error);
            this.smartGiftFlow.delete(chatId);
            await this.bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте снова.');
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
            // Сбрасываем флаги напоминаний для всех пользователей
            this.sentReminders.clear();
            await this.checkAndSendRemindersWithTracking();
        }, {
            scheduled: true,
            timezone: "Europe/Moscow"
        });

        console.log('✅ Cron jobs set up successfully - daily reminders at 09:00 MSK');
    }

    async checkAndSendRemindersWithTracking() {
        try {
            const today = new Date();
            const month = today.getMonth() + 1;
            const day = today.getDate();

            console.log(`Checking birthdays for ${day}.${month}`);

            const birthdays = await this.db.getBirthdaysByDate(month, day);

            if (birthdays.length === 0) {
                console.log('No birthdays today');
                return;
            }

            console.log(`Found ${birthdays.length} birthdays today`);

            // Группируем дни рождения по пользователям
            const birthdaysByUser = {};
            for (const birthday of birthdays) {
                if (!birthdaysByUser[birthday.chat_id]) {
                    birthdaysByUser[birthday.chat_id] = [];
                }
                birthdaysByUser[birthday.chat_id].push(birthday);
            }

            // Отправляем напоминания каждому пользователю
            for (const [chatId, userBirthdays] of Object.entries(birthdaysByUser)) {
                for (const birthday of userBirthdays) {
                    await this.sendInstantBirthdayMessage(chatId, birthday);
                }
            }

        } catch (error) {
            console.error('Error checking reminders:', error);
        }
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