import moment from 'moment';
import { AIAssistant } from './aiAssistant.js';

export class BirthdayReminder {
    constructor(bot, database) {
        this.bot = bot;
        this.db = database;
        this.aiAssistant = new AIAssistant();
    }

    async checkAndSendReminders() {
        try {
            const today = moment();
            const month = today.month() + 1; // moment.js месяцы начинаются с 0
            const day = today.date();

            console.log(`Checking birthdays for ${day}.${month}`);

            const birthdays = await this.db.getBirthdaysByDate(month, day);
            
            if (birthdays.length === 0) {
                console.log('No birthdays today');
                return;
            }

            console.log(`Found ${birthdays.length} birthdays today`);

            for (const birthday of birthdays) {
                await this.sendBirthdayReminder(birthday);
            }

        } catch (error) {
            console.error('Error checking reminders:', error);
        }
    }

    async sendBirthdayReminder(birthday) {
        try {
            const chatId = birthday.chat_id;
            const name = birthday.name;
            const info = birthday.info || '';

            // Основное напоминание
            const reminderMessage = `🎉 Сегодня день рождения у ${name}!`;
            await this.bot.sendMessage(chatId, reminderMessage);

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

            console.log(`Sent birthday reminder for ${name} to chat ${chatId}`);

        } catch (error) {
            console.error(`Error sending reminder for ${birthday.name}:`, error);
        }
    }

    getNextBirthday(birthDate) {
        const today = moment();
        const birthMoment = moment(birthDate);
        
        // Устанавливаем год на текущий
        let nextBirthday = birthMoment.clone().year(today.year());
        
        // Если день рождения уже прошел в этом году, берем следующий год
        if (nextBirthday.isBefore(today, 'day')) {
            nextBirthday = nextBirthday.add(1, 'year');
        }
        
        return nextBirthday;
    }

    getDaysUntilBirthday(birthdayDate) {
        const today = moment();
        const daysUntil = birthdayDate.diff(today, 'days');
        return Math.max(0, daysUntil);
    }

    // Метод для отправки напоминания за N дней до дня рождения
    async checkUpcomingBirthdays(daysAhead = 7) {
        try {
            const today = moment();
            const futureDate = today.clone().add(daysAhead, 'days');
            
            const allBirthdays = await this.db.getAllBirthdays();
            const upcomingBirthdays = [];

            for (const birthday of allBirthdays) {
                const nextBirthday = this.getNextBirthday(birthday.birth_date);
                const daysUntil = this.getDaysUntilBirthday(nextBirthday);
                
                if (daysUntil === daysAhead) {
                    upcomingBirthdays.push({
                        ...birthday,
                        nextBirthday,
                        daysUntil
                    });
                }
            }

            for (const birthday of upcomingBirthdays) {
                const message = `⏰ Напоминание: через ${daysUntil} дней день рождения у ${birthday.name}!`;
                await this.bot.sendMessage(birthday.chat_id, message);
            }

            return upcomingBirthdays;

        } catch (error) {
            console.error('Error checking upcoming birthdays:', error);
            return [];
        }
    }

    // Метод для получения статистики дней рождения
    async getBirthdayStats(chatId) {
        try {
            const stats = await this.db.getBirthdayStats(chatId);
            return stats;
        } catch (error) {
            console.error('Error getting birthday stats:', error);
            return null;
        }
    }
}