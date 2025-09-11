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

            // Генерируем поздравление и идею подарка
            const congratulations = await this.aiAssistant.generateCongratulations(name, info);
            const giftIdea = await this.aiAssistant.generateGiftIdea(name, info);

            // Создаем объединенное сообщение
            const combinedMessage = this.createCombinedMessage(name, congratulations, giftIdea);
            await this.bot.sendMessage(chatId, combinedMessage);

            console.log(`Sent birthday reminder for ${name} to chat ${chatId}`);

        } catch (error) {
            console.error(`Error sending reminder for ${birthday.name}:`, error);
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