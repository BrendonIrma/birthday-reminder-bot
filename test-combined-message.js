// Тестируем функцию createCombinedMessage
function createCombinedMessage(name, congratulations, giftIdea) {
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

// Тестовые данные
const testCases = [
    {
        name: "Анна",
        congratulations: "Поздравляю с днем рождения! Желаю здоровья, счастья и успехов во всех начинаниях!",
        giftIdea: "Книга по любимому хобби или сертификат в спа-салон"
    },
    {
        name: "Петр",
        congratulations: "С днем рождения! Пусть этот год принесет много радости и новых возможностей!",
        giftIdea: "Набор для барбекю или билеты на концерт"
    },
    {
        name: "Мария",
        congratulations: "Поздравляю! Желаю крепкого здоровья, семейного благополучия и исполнения всех мечтаний! Пусть каждый день приносит радость и улыбки!",
        giftIdea: "Цветы, шоколад или подарочный сертификат в любимый магазин. Также можно подарить что-то связанное с ее хобби или увлечениями."
    }
];

console.log('Тестирование объединенных сообщений:');
console.log('=====================================\n');

testCases.forEach((testCase, index) => {
    console.log(`Тест ${index + 1}: ${testCase.name}`);
    console.log('-----------------------------------');
    
    const result = createCombinedMessage(testCase.name, testCase.congratulations, testCase.giftIdea);
    
    console.log(`Длина сообщения: ${result.length} символов`);
    console.log(`Сообщение:`);
    console.log(result);
    console.log('\n');
});