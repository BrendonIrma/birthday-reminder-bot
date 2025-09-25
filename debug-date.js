import moment from 'moment';

// Тестируем parseDate функцию
function parseDate(dateStr) {
    try {
        console.log(`Парсим дату: "${dateStr}"`);
        
        // Нормализуем разделители для числовых форматов
        const normalizedDate = dateStr.replace(/[.\-/]/g, '.');
        console.log(`Нормализованная дата: "${normalizedDate}"`);
        
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
            const parsedDate = moment(normalizedDate, format, true);
            console.log(`Формат ${format}: ${parsedDate.isValid() ? '✅' : '❌'} - ${parsedDate.format()}`);
            
            if (parsedDate.isValid()) {
                // Если год не указан, используем текущий год
                if (format.includes('DD.MM') || format.includes('D.M') || 
                    format.includes('MM.DD') || format.includes('M.D')) {
                    const currentYear = moment().year();
                    if (format.includes('DD.MM') || format.includes('D.M')) {
                        const newDate = moment(normalizedDate + '.' + currentYear, 'DD.MM.YYYY', true);
                        if (!newDate.isValid()) {
                            const newDate2 = moment(normalizedDate + '.' + currentYear, 'D.M.YYYY', true);
                            console.log(`  С годом ${currentYear}: ${newDate2.isValid() ? '✅' : '❌'} - ${newDate2.format()}`);
                        } else {
                            console.log(`  С годом ${currentYear}: ${newDate.isValid() ? '✅' : '❌'} - ${newDate.format()}`);
                        }
                    } else {
                        const newDate = moment(normalizedDate + '.' + currentYear, 'MM.DD.YYYY', true);
                        if (!newDate.isValid()) {
                            const newDate2 = moment(normalizedDate + '.' + currentYear, 'M.D.YYYY', true);
                            console.log(`  С годом ${currentYear}: ${newDate2.isValid() ? '✅' : '❌'} - ${newDate2.format()}`);
                        } else {
                            console.log(`  С годом ${currentYear}: ${newDate.isValid() ? '✅' : '❌'} - ${newDate.format()}`);
                        }
                    }
                }
                return parsedDate;
            }
        }

        console.log('❌ Ни один формат не подошел');
        return null;

    } catch (error) {
        console.error('Error parsing date:', error);
        return null;
    }
}

// Тестируем
parseDate("15.03.1990");