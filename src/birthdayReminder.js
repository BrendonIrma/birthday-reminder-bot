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

            // Генерируем поздравление и несколько идей подарков
            const congratulations = await this.aiAssistant.generateCongratulations(name, info);
            const giftIdeas = await this.aiAssistant.generateMultipleGiftIdeas(name, info, 3);

            // Создаем объединенное сообщение
            const combinedMessage = this.createCombinedMessage(name, congratulations, giftIdeas);
            await this.bot.sendMessage(chatId, combinedMessage);

            console.log(`Sent birthday reminder for ${name} to chat ${chatId}`);

        } catch (error) {
            console.error(`Error sending reminder for ${birthday.name}:`, error);
        }
    }

    createCombinedMessage(name, congratulations, giftIdeas) {
        let message = `🎉 Сегодня день рождения у ${name}!\n\n`;
        
        // Добавляем поздравление
        if (congratulations) {
            message += `💌 ${congratulations}\n\n`;
        }
        
        // Добавляем идеи подарков
        if (giftIdeas) {
            message += `🎁 Идеи подарков:\n${giftIdeas}`;
        }
        
        // Ограничиваем до 500 символов (увеличили лимит для нескольких идей)
        if (message.length > 500) {
            // Если сообщение слишком длинное, сокращаем поздравление и идеи подарков
            const baseMessage = `🎉 Сегодня день рождения у ${name}!\n\n`;
            const availableSpace = 500 - baseMessage.length;
            
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
                    
                message = `${baseMessage}💌 ${congratulationsText}\n\n🎁 Идеи подарков:\n${giftIdeasText}`;
            } else if (congratulations) {
                congratulationsText = congratulations.length > availableSpace - 5
                    ? congratulations.substring(0, availableSpace - 8) + '...'
                    : congratulations;
                message = `${baseMessage}💌 ${congratulationsText}`;
            } else if (giftIdeas) {
                giftIdeasText = giftIdeas.length > availableSpace - 5
                    ? giftIdeas.substring(0, availableSpace - 8) + '...'
                    : giftIdeas;
                message = `${baseMessage}🎁 Идеи подарков:\n${giftIdeasText}`;
            }
        }
        
        return message;
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