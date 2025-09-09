import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import dotenv from 'dotenv';
import moment from 'moment';
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

Я буду напоминать вам о днях рождения и предложу идеи для поздравлений и подарков! 🎁
            `;
            await this.bot.sendMessage(chatId, welcomeMessage);
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
            `;
            await this.bot.sendMessage(chatId, helpMessage);
        });
    }

    async handleMessage(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;

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
                const confirmationMessage = `✅ Отлично! Я запомнил день рождения ${parsedData.name} (${parsedData.originalDate}). Буду напоминать вам об этом! 🎂`;
                await this.bot.sendMessage(chatId, confirmationMessage);
            } else {
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

            // Основное сообщение о дне рождения
            const birthdayMessage = `🎉 Сегодня день рождения у ${name}!`;
            await this.bot.sendMessage(chatId, birthdayMessage);

            // Генерируем поздравление
            const congratulations = await this.aiAssistant.generateCongratulations(name, info);
            if (congratulations) {
                await this.bot.sendMessage(chatId, `💌 Поздравление:\n\n${congratulations}`);
            }

            // Генерируем идею подарка
            const giftIdea = await this.aiAssistant.generateGiftIdea(name, info);
            if (giftIdea) {
                await this.bot.sendMessage(chatId, `🎁 Идея для подарка:\n\n${giftIdea}`);
            }

        } catch (error) {
            console.error('Error sending instant birthday message:', error);
        }
    }

    async showBirthdayList(chatId) {
        try {
            const birthdays = await this.db.getBirthdaysByChatId(chatId);
            
            if (birthdays.length === 0) {
                await this.bot.sendMessage(chatId, '📅 У вас пока нет сохраненных дней рождения.');
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

            await this.bot.sendMessage(chatId, message);
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