import moment from 'moment';

export class MessageParser {
    constructor() {
        // Настройка локали для moment.js
        moment.locale('ru');
    }

    parseMessage(text) {
        try {
            // Очищаем текст от лишних пробелов
            const cleanText = text.trim();
            
            // Различные паттерны для парсинга (сначала более специфичные)
            const patterns = [
                // Паттерн: "Имя, дата, информация" (с годом)
                /^(.+?),\s*(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s*,?\s*(.*)$/i,
                // Паттерн: "Имя дата информация" (с годом, без запятых)
                /^(.+?)\s+(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s+(.*)$/i,
                // Паттерн: "дата Имя информация" (с годом)
                /^(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s+(.+?)\s*,?\s*(.*)$/i,
                // Паттерн: "Имя, дата" (без информации, с годом)
                /^(.+?),\s*(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s*$/i,
                // Паттерн: "Имя дата" (без информации, с годом)
                /^(.+?)\s+(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s*$/i,
                // Паттерн: "Имя, дата, информация" (без года)
                /^(.+?),\s*(\d{1,2}[.\-/]\d{1,2})\s*,?\s*(.*)$/i,
                // Паттерн: "Имя дата информация" (без года, без запятых)
                /^(.+?)\s+(\d{1,2}[.\-/]\d{1,2})\s+(.*)$/i,
                // Паттерн: "дата Имя информация" (без года)
                /^(\d{1,2}[.\-/]\d{1,2})\s+(.+?)\s*,?\s*(.*)$/i,
                // Паттерн: "Имя, дата" (без информации, без года)
                /^(.+?),\s*(\d{1,2}[.\-/]\d{1,2})\s*$/i,
                // Паттерн: "Имя дата" (без информации, без года)
                /^(.+?)\s+(\d{1,2}[.\-/]\d{1,2})\s*$/i,
                // Паттерн: "Имя, текстовый формат даты, информация"
                /^(.+?),\s*([а-яё\s\d]+)\s*,?\s*(.*)$/i,
                // Паттерн: "Имя текстовый формат даты информация"
                /^(.+?)\s+([а-яё\s\d]+)\s+(.*)$/i,
                // Паттерн: "Имя, текстовый формат даты" (без информации)
                /^(.+?),\s*([а-яё\s\d]+)\s*$/i,
                // Паттерн: "Имя текстовый формат даты" (без информации)
                /^(.+?)\s+([а-яё\s\d]+)\s*$/i
            ];

            let match = null;
            let name = '';
            let dateStr = '';
            let info = '';

            // Пробуем каждый паттерн
            for (let i = 0; i < patterns.length; i++) {
                const pattern = patterns[i];
                match = cleanText.match(pattern);
                if (match) {
                    // Паттерны 2, 7 - "дата Имя информация"
                    if (i === 2 || i === 7) {
                        dateStr = match[1];
                        name = match[2];
                        info = match[3];
                    } else {
                        // Для остальных паттернов
                        name = match[1];
                        dateStr = match[2];
                        info = match[3];
                    }
                    break;
                }
            }

            if (!match) {
                return {
                    error: 'Не удалось распознать формат сообщения. Пожалуйста, используйте формат: "Имя, дата рождения, краткая информация"'
                };
            }

            // Очищаем имя от лишних символов
            name = name.trim().replace(/[^\w\s\u0400-\u04FF]/g, '');

            if (!name) {
                return {
                    error: 'Имя не может быть пустым'
                };
            }

            // Парсим дату
            const parsedDate = this.parseDate(dateStr);
            if (!parsedDate) {
                return {
                    error: 'Неверный формат даты. Поддерживаемые форматы:\n• 15.03.1990 или 15.03\n• 3 марта или 3 марта 1990\n• 15/03/1990 или 15-03-1990\n• 03.15.1990 (месяц.день.год)'
                };
            }

            // Очищаем информацию
            info = info.trim();

            return {
                name: name,
                date: parsedDate.format('YYYY-MM-DD'),
                info: info || null,
                originalDate: parsedDate.format('DD.MM.YYYY')
            };

        } catch (error) {
            console.error('Error parsing message:', error);
            return {
                error: 'Произошла ошибка при обработке сообщения'
            };
        }
    }

    parseDate(dateStr) {
        try {
            // Сначала пробуем парсить текстовые форматы дат
            let parsedDate = this.parseTextDate(dateStr);
            if (parsedDate) {
                return parsedDate;
            }

            // Нормализуем разделители для числовых форматов
            const normalizedDate = dateStr.replace(/[.\-/]/g, '.');
            
            // Различные числовые форматы дат
            const formats = [
                'DD.MM.YYYY',
                'DD.MM.YY',
                'D.M.YYYY',
                'D.M.YY',
                'DD.MM',
                'D.M',
                'MM.DD.YYYY',
                'MM.DD.YY',
                'M.D.YYYY',
                'M.D.YY',
                'MM.DD',
                'M.D',
                'YYYY.MM.DD',
                'YY.MM.DD',
                'YYYY.M.D',
                'YY.M.D',
                'MM.DD.YYYY',
                'M.D.YYYY'
            ];

            // Пробуем каждый формат
            for (const format of formats) {
                parsedDate = moment(normalizedDate, format, true);
                if (parsedDate.isValid()) {
                    // Если год не указан, используем текущий год
                    if ((format.includes('DD.MM') || format.includes('D.M') || 
                         format.includes('MM.DD') || format.includes('M.D')) && 
                        !format.includes('YYYY') && !format.includes('YY')) {
                        const currentYear = moment().year();
                        if (format.includes('DD.MM') || format.includes('D.M')) {
                            parsedDate = moment(normalizedDate + '.' + currentYear, 'DD.MM.YYYY', true);
                            if (!parsedDate.isValid()) {
                                parsedDate = moment(normalizedDate + '.' + currentYear, 'D.M.YYYY', true);
                            }
                        } else {
                            parsedDate = moment(normalizedDate + '.' + currentYear, 'MM.DD.YYYY', true);
                            if (!parsedDate.isValid()) {
                                parsedDate = moment(normalizedDate + '.' + currentYear, 'M.D.YYYY', true);
                            }
                        }
                    }
                    break;
                }
            }

            if (!parsedDate || !parsedDate.isValid()) {
                return null;
            }

            // Проверяем разумность даты (не раньше 1900 года и не позже 2100)
            if (parsedDate.year() < 1900 || parsedDate.year() > 2100) {
                return null;
            }

            return parsedDate;

        } catch (error) {
            console.error('Error parsing date:', error);
            return null;
        }
    }

    parseTextDate(dateStr) {
        try {
            const text = dateStr.toLowerCase().trim();
            
            // Словарь месяцев
            const months = {
                'января': 1, 'янв': 1, 'январь': 1,
                'февраля': 2, 'фев': 2, 'февраль': 2,
                'марта': 3, 'мар': 3, 'март': 3,
                'апреля': 4, 'апр': 4, 'апрель': 4,
                'мая': 5, 'май': 5,
                'июня': 6, 'июн': 6, 'июнь': 6,
                'июля': 7, 'июл': 7, 'июль': 7,
                'августа': 8, 'авг': 8, 'август': 8,
                'сентября': 9, 'сен': 9, 'сентябрь': 9,
                'октября': 10, 'окт': 10, 'октябрь': 10,
                'ноября': 11, 'ноя': 11, 'ноябрь': 11,
                'декабря': 12, 'дек': 12, 'декабрь': 12
            };

            // Паттерны для текстовых дат
            const patterns = [
                // "3 марта", "15 мая", "1 января"
                /^(\d{1,2})\s+([а-яё]+)$/,
                // "3 марта 1990", "15 мая 2000"
                /^(\d{1,2})\s+([а-яё]+)\s+(\d{4})$/,
                // "марта 3", "мая 15"
                /^([а-яё]+)\s+(\d{1,2})$/,
                // "марта 3 1990", "мая 15 2000"
                /^([а-яё]+)\s+(\d{1,2})\s+(\d{4})$/
            ];

            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) {
                    let day, month, year;
                    
                    if (pattern === patterns[0] || pattern === patterns[1]) {
                        // "3 марта" или "3 марта 1990"
                        day = parseInt(match[1]);
                        const monthName = match[2];
                        month = months[monthName];
                        year = match[3] ? parseInt(match[3]) : moment().year();
                    } else {
                        // "марта 3" или "марта 3 1990"
                        const monthName = match[1];
                        month = months[monthName];
                        day = parseInt(match[2]);
                        year = match[3] ? parseInt(match[3]) : moment().year();
                    }

                    if (month && day >= 1 && day <= 31) {
                        const parsedDate = moment(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
                        if (parsedDate.isValid() && 
                            parsedDate.date() === day && 
                            parsedDate.month() + 1 === month && 
                            parsedDate.year() === year) {
                            return parsedDate;
                        }
                    }
                }
            }

            return null;

        } catch (error) {
            console.error('Error parsing text date:', error);
            return null;
        }
    }

    // Вспомогательный метод для валидации даты
    isValidDate(day, month, year) {
        try {
            const date = moment(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
            return date.isValid() && 
                   date.date() === day && 
                   date.month() + 1 === month && 
                   date.year() === year;
        } catch (error) {
            return false;
        }
    }
}