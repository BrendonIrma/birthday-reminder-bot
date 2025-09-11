// Тестируем функцию createCombinedMessage с длинными текстами
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

// Тест с очень длинными текстами
const longCongratulations = "Поздравляю с днем рождения! Желаю крепкого здоровья, счастья, успехов во всех начинаниях, любви, радости, благополучия, исполнения всех мечтаний, новых достижений, интересных путешествий, верных друзей, семейного счастья, карьерного роста, творческих успехов, финансового благополучия и всего самого наилучшего! Пусть каждый день приносит только положительные эмоции и радостные моменты!";
const longGiftIdea = "Для подарка можно выбрать что-то особенное: книги по любимым темам, сертификаты в спа-салон, билеты на концерт или спектакль, украшения, парфюмерию, предметы для хобби, подарочные карты в любимые магазины, цветы, шоколад, вино, предметы интерьера, технику, одежду, обувь, аксессуары, спортивные товары, товары для дома, сувениры, картины, скульптуры, музыкальные инструменты, игры, игрушки, предметы коллекционирования и многое другое!";

console.log('Тест с длинными текстами:');
console.log('=========================\n');

const result = createCombinedMessage("Александр", longCongratulations, longGiftIdea);

console.log(`Длина сообщения: ${result.length} символов`);
console.log(`Сообщение:`);
console.log(result);
console.log('\n');

// Проверим, что сообщение действительно не превышает 400 символов
if (result.length <= 400) {
    console.log('✅ Сообщение не превышает 400 символов');
} else {
    console.log('❌ Сообщение превышает 400 символов!');
}