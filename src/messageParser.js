import moment from 'moment';

export class MessageParser {
    constructor() {
        // Настройка локали для moment.js
        moment.locale('ru');
    }

    parseMessage(text) {
        try {
            // Проверяем длину сообщения
            if (text.length > 1000) {
                return {
                    error: '❌ Сообщение слишком длинное (максимум 1000 символов).'
                };
            }

            // Очищаем текст от лишних пробелов
            const cleanText = text.trim();
            
            // Используем новый умный парсер
            const result = this.smartParse(cleanText);
            
            if (result.error) {
                return result;
            }

            // Валидация и очистка данных
            const validationResult = this.validateAndCleanData(result);
            if (validationResult.error) {
                return validationResult;
            }

            return validationResult;

        } catch (error) {
            console.error('Error parsing message:', error);
            return {
                error: 'Произошла ошибка при обработке сообщения'
            };
        }
    }

    smartParse(text) {
        try {
            // Разбиваем текст на части по запятым, точкам, восклицательным знакам
            const parts = text.split(/[,.!?;]/).map(part => part.trim()).filter(part => part.length > 0);
            
            // Если нет разделителей, разбиваем по пробелам
            if (parts.length === 1) {
                const words = text.split(/\s+/);
                if (words.length >= 2) {
                    // Пробуем найти дату в словах
                    const dateIndex = this.findDateInWords(words);
                    if (dateIndex !== -1) {
                        let name = words.slice(0, dateIndex).join(' ');
                        let dateStr = words[dateIndex];
                        let info = words.slice(dateIndex + 1).join(' ');
                        
                        // Если дата состоит из двух слов (например, "15 марта")
                        if (dateIndex < words.length - 1 && this.isDatePart(words[dateIndex] + ' ' + words[dateIndex + 1])) {
                            dateStr = words[dateIndex] + ' ' + words[dateIndex + 1];
                            info = words.slice(dateIndex + 2).join(' ');
                        }
                        
                        // Если имя пустое (дата в начале), берем первое слово после даты
                        if (!name && info) {
                            const infoWords = info.split(/\s+/);
                            if (infoWords.length > 0) {
                                name = infoWords[0];
                                info = infoWords.slice(1).join(' ');
                            }
                        }
                        
                        return {
                            name: name,
                            dateStr: dateStr,
                            info: info
                        };
                    }
                }
            }

            // Анализируем каждую часть
            let name = '';
            let dateStr = '';
            let info = '';

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                
                // Проверяем, является ли часть датой
                if (this.isDatePart(part)) {
                    if (!dateStr) {
                        dateStr = part;
                    }
                }
                // Проверяем, является ли часть именем (если еще не найдено)
                else if (!name && this.isNamePart(part)) {
                    name = part;
                }
                // Остальное - информация
                else {
                    if (info) {
                        info += ', ' + part;
                    } else {
                        info = part;
                    }
                }
            }

            // Если не нашли дату в частях, ищем в исходном тексте
            if (!dateStr) {
                const dateMatch = this.findDateInText(text);
                if (dateMatch) {
                    dateStr = dateMatch;
                }
            }

            // Если не нашли имя, ищем его в частях
            if (!name) {
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    if (!this.isDatePart(part) && this.isNamePart(part)) {
                        name = part;
                        break;
                    }
                }
            }

            // Если все еще не нашли имя, ищем в исходном тексте
            if (!name) {
                const words = text.split(/\s+/);
                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    if (!this.isDatePart(word) && this.isNamePart(word)) {
                        name = word;
                        break;
                    }
                }
            }

            // Если все еще не нашли имя, берем первое слово, которое не является датой
            if (!name) {
                const words = text.split(/\s+/);
                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    if (!this.isDatePart(word) && word.length > 0) {
                        name = word;
                        break;
                    }
                }
            }

            // Если все еще не нашли имя, берем первое слово после даты
            if (!name && dateStr) {
                const words = text.split(/\s+/);
                const dateIndex = words.findIndex(word => word === dateStr || word.includes(dateStr));
                if (dateIndex !== -1) {
                    for (let i = dateIndex + 1; i < words.length; i++) {
                        const word = words[i];
                        if (!this.isDatePart(word) && word.length > 0) {
                            name = word;
                            break;
                        }
                    }
                }
            }

            // Если все еще не нашли имя, берем первое слово, которое не является датой
            if (!name) {
                const words = text.split(/\s+/);
                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    if (!this.isDatePart(word) && word.length > 0) {
                        name = word;
                        break;
                    }
                }
            }

            // Если не нашли информацию, берем оставшиеся части
            if (!info && parts.length > 1) {
                const remainingParts = parts.slice(1).filter(part => part !== dateStr);
                info = remainingParts.join(', ');
            }

            if (!name) {
                return {
                    error: '❌ Не удалось найти имя в сообщении.'
                };
            }

            if (!dateStr) {
                return {
                    error: '❌ Не удалось найти дату в сообщении.\n\n📅 Поддерживаемые форматы дат:\n• 15.03.1990 или 15.03\n• 3 марта или 3 марта 1990\n• 15/03/1990 или 15-03-1990\n• 03.15.1990 (месяц.день.год)'
                };
            }

            return {
                name: name,
                dateStr: dateStr,
                info: info
            };

        } catch (error) {
            console.error('Error in smartParse:', error);
            return {
                error: 'Ошибка при умном парсинге сообщения'
            };
        }
    }

    isDatePart(part) {
        // Проверяем числовые форматы дат
        if (/\d{1,2}[.\-/]\d{1,2}([.\-/]\d{2,4})?/.test(part)) {
            return true;
        }
        
        // Проверяем текстовые форматы дат
        const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 
                       'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
                       'янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
                       'январь', 'февраль', 'март', 'апрель', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
        
        // Порядковые числительные
        const ordinals = ['первого', 'второго', 'третьего', 'четвертого', 'пятого', 'шестого', 'седьмого', 'восьмого', 'девятого', 'десятого',
                         'одиннадцатого', 'двенадцатого', 'тринадцатого', 'четырнадцатого', 'пятнадцатого', 'шестнадцатого', 'семнадцатого', 'восемнадцатого', 'девятнадцатого', 'двадцатого',
                         'двадцать первого', 'двадцать второго', 'двадцать третьего', 'двадцать четвертого', 'двадцать пятого', 'двадцать шестого', 'двадцать седьмого', 'двадцать восьмого', 'двадцать девятого', 'тридцатого', 'тридцать первого'];
        
        const lowerPart = part.toLowerCase();
        
        // Проверяем, содержит ли часть месяц
        const hasMonth = months.some(month => lowerPart.includes(month));
        
        // Проверяем, содержит ли часть порядковое числительное
        const hasOrdinal = ordinals.some(ordinal => lowerPart.includes(ordinal));
        
        // Если есть месяц, проверяем, есть ли рядом число или порядковое числительное
        if (hasMonth) {
            // Ищем число в той же части
            const numberMatch = part.match(/\d+/);
            if (numberMatch) {
                return true;
            }
            
            // Или проверяем, что это не просто слово с месяцем
            const words = part.split(/\s+/);
            if (words.length === 1 && months.some(month => lowerPart === month)) {
                return false; // Только название месяца - не дата
            }
        }
        
        // Если есть порядковое числительное, проверяем, есть ли рядом месяц
        if (hasOrdinal) {
            // Ищем месяц в той же части
            const monthMatch = months.some(month => lowerPart.includes(month));
            if (monthMatch) {
                return true;
            }
        }
        
        // Дополнительная проверка: если слово содержит месяц, но не является датой
        if (hasMonth) {
            // Проверяем, что это не просто слово, содержащее название месяца
            const words = part.split(/\s+/);
            if (words.length === 1) {
                // Если это одно слово и оно не является точным названием месяца
                const exactMonth = months.some(month => lowerPart === month);
                if (!exactMonth) {
                    return false; // Это не дата, а слово, содержащее название месяца
                }
            } else {
                // Если это несколько слов, проверяем, что это действительно дата
                // Например, "15 марта" - дата, "моя любимая" - не дата
                const hasNumber = /\d+/.test(part);
                if (!hasNumber && !hasOrdinal) {
                    return false; // Нет числа и нет порядкового числительного - не дата
                }
            }
        }
        
        return hasMonth || hasOrdinal;
    }

    isNamePart(part) {
        // Имя должно содержать буквы и не быть датой
        if (this.isDatePart(part)) {
            return false;
        }
        
        // Проверяем, что содержит буквы (русские или латинские)
        if (!/[а-яёa-z]/i.test(part)) {
            return false;
        }
        
        // Имя не должно быть слишком длинным
        if (part.length > 50) {
            return false;
        }
        
        // Имя не должно содержать только цифры
        if (/^\d+$/.test(part)) {
            return false;
        }
        
        return true;
    }

    findDateInWords(words) {
        // Сначала ищем числовые форматы дат
        for (let i = 0; i < words.length; i++) {
            if (/\d{1,2}[.\-/]\d{1,2}([.\-/]\d{2,4})?/.test(words[i])) {
                return i;
            }
        }
        
        // Затем ищем текстовые форматы (число + месяц или месяц + число)
        for (let i = 0; i < words.length - 1; i++) {
            const currentWord = words[i];
            const nextWord = words[i + 1];
            const combined = currentWord + ' ' + nextWord;
            
            // Проверяем "15 марта" или "марта 15"
            if (this.isDatePart(combined)) {
                return i;
            }
        }
        
        return -1;
    }

    findDateInText(text) {
        // Ищем дату в тексте с помощью регулярных выражений
        const datePatterns = [
            // Числовые форматы
            /\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}/g,
            /\d{1,2}[.\-/]\d{1,2}/g,
            // Текстовые форматы с числом и месяцем
            /\d+\s+[а-яё]+/gi,
            /[а-яё]+\s+\d+/gi
        ];
        
        for (const pattern of datePatterns) {
            const matches = text.match(pattern);
            if (matches) {
                for (const match of matches) {
                    if (this.isDatePart(match)) {
                        return match;
                    }
                }
            }
        }
        
        return null;
    }

    validateAndCleanData(data) {
        try {
            // Очищаем имя от лишних символов и проверяем на подозрительные паттерны
            let name = data.name.trim().replace(/[^\w\s\u0400-\u04FF]/g, '');
            
            // Защита от ReDoS атак - проверяем на повторяющиеся символы
            if (/(.)\1{50,}/.test(name)) {
                return {
                    error: '❌ Имя содержит слишком много повторяющихся символов.'
                };
            }

            if (!name) {
                return {
                    error: 'Имя не может быть пустым'
                };
            }

            // Ограничиваем длину имени
            if (name.length > 100) {
                return {
                    error: '❌ Имя слишком длинное (максимум 100 символов).'
                };
            }

            // Парсим дату
            const parsedDate = this.parseDate(data.dateStr);
            if (!parsedDate) {
                return {
                    error: '❌ Неверный формат даты.\n\n📅 Поддерживаемые форматы:\n• 15.03.1990 или 15.03\n• 3 марта или 3 марта 1990\n• 15/03/1990 или 15-03-1990\n• 03.15.1990 (месяц.день.год)\n\n🔍 Подробная справка: /format'
                };
            }

            // Очищаем информацию и проверяем на подозрительные паттерны
            let info = data.info ? data.info.trim() : '';
            
            // Защита от ReDoS атак в информации
            if (/(.)\1{50,}/.test(info)) {
                return {
                    error: '❌ Информация содержит слишком много повторяющихся символов.'
                };
            }
            
            // Ограничиваем длину информации
            if (info.length > 500) {
                return {
                    error: '❌ Информация слишком длинная (максимум 500 символов).'
                };
            }

            return {
                name: name,
                date: parsedDate.format('YYYY-MM-DD'),
                info: info || null,
                originalDate: parsedDate.format('DD.MM.YYYY')
            };

        } catch (error) {
            console.error('Error validating data:', error);
            return {
                error: 'Ошибка при валидации данных'
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

            // Словарь порядковых числительных
            const ordinals = {
                'первого': 1, 'второго': 2, 'третьего': 3, 'четвертого': 4, 'пятого': 5,
                'шестого': 6, 'седьмого': 7, 'восьмого': 8, 'девятого': 9, 'десятого': 10,
                'одиннадцатого': 11, 'двенадцатого': 12, 'тринадцатого': 13, 'четырнадцатого': 14, 'пятнадцатого': 15,
                'шестнадцатого': 16, 'семнадцатого': 17, 'восемнадцатого': 18, 'девятнадцатого': 19, 'двадцатого': 20,
                'двадцать первого': 21, 'двадцать второго': 22, 'двадцать третьего': 23, 'двадцать четвертого': 24, 'двадцать пятого': 25,
                'двадцать шестого': 26, 'двадцать седьмого': 27, 'двадцать восьмого': 28, 'двадцать девятого': 29, 'тридцатого': 30,
                'тридцать первого': 31
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
                /^([а-яё]+)\s+(\d{1,2})\s+(\d{4})$/,
                // "третьего марта", "пятнадцатого мая"
                /^([а-яё\s]+)\s+([а-яё]+)$/,
                // "третьего марта 1990", "пятнадцатого мая 2000"
                /^([а-яё\s]+)\s+([а-яё]+)\s+(\d{4})$/
            ];

            for (let i = 0; i < patterns.length; i++) {
                const pattern = patterns[i];
                const match = text.match(pattern);
                if (match) {
                    let day, month, year;
                    
                    if (i === 0 || i === 1) {
                        // "3 марта" или "3 марта 1990"
                        day = parseInt(match[1]);
                        const monthName = match[2];
                        month = months[monthName];
                        year = match[3] ? parseInt(match[3]) : moment().year();
                    } else if (i === 2 || i === 3) {
                        // "марта 3" или "марта 3 1990"
                        const monthName = match[1];
                        month = months[monthName];
                        day = parseInt(match[2]);
                        year = match[3] ? parseInt(match[3]) : moment().year();
                    } else if (i === 4 || i === 5) {
                        // "третьего марта" или "третьего марта 1990"
                        const dayName = match[1].trim();
                        const monthName = match[2];
                        day = ordinals[dayName];
                        month = months[monthName];
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