export class AIAssistant {
    constructor() {
        this.apiKey = process.env.DEEPSEEK_API_KEY;
        this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    }

    async generateCongratulations(name, info = '') {
        try {
            if (!this.apiKey) {
                return this.getDefaultCongratulations(name);
            }

            const prompt = this.buildCongratulationsPrompt(name, info);
            
            const response = await this.callDeepSeek(prompt, "Ты помощник для создания персонализированных поздравлений с днем рождения. Отвечай только на русском языке, будь дружелюбным и искренним. Максимум 100 символов.");

            return this.truncateText(response, 100);

        } catch (error) {
            console.error('Error generating congratulations:', error);
            return this.getDefaultCongratulations(name);
        }
    }

    async generateGiftIdea(name, info = '') {
        try {
            if (!this.apiKey) {
                return this.getDefaultGiftIdea(name);
            }

            const prompt = this.buildGiftIdeaPrompt(name, info);
            
            const response = await this.callDeepSeek(prompt, "Ты помощник для предложения идей подарков на день рождения. Отвечай только на русском языке, будь креативным и практичным. Предложи 1 идею подарка. Максимум 100 символов.");

            return this.truncateText(response, 100);

        } catch (error) {
            console.error('Error generating gift idea:', error);
            return this.getDefaultGiftIdea(name);
        }
    }

    async generateMultipleGiftIdeas(name, info = '', count = 3) {
        try {
            if (!this.apiKey) {
                return this.getDefaultMultipleGiftIdeas(name, count);
            }

            const prompt = this.buildMultipleGiftIdeasPrompt(name, info, count);
            
            const response = await this.callDeepSeek(prompt, `Ты помощник для предложения идей подарков на день рождения. Отвечай только на русском языке, будь креативным и практичным. Предложи ${count} разных идей подарков. Каждая идея на новой строке с эмодзи. Максимум 300 символов.`);

            return this.formatMultipleGiftIdeas(response, count);

        } catch (error) {
            console.error('Error generating multiple gift ideas:', error);
            return this.getDefaultMultipleGiftIdeas(name, count);
        }
    }

    async callDeepSeek(prompt, systemMessage) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: systemMessage },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 200
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error('DeepSeek API error:', error);
            throw error;
        }
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 3) + '...';
    }

    buildCongratulationsPrompt(name, info) {
        let prompt = `Создай теплое поздравление с днем рождения для ${name}.`;
        
        if (info) {
            prompt += ` Информация: ${info}.`;
        }
        
        prompt += ` Максимум 100 символов, на русском языке.`;
        
        return prompt;
    }

    buildGiftIdeaPrompt(name, info) {
        let prompt = `Предложи 1 идею подарка для ${name}.`;
        
        if (info) {
            prompt += ` Информация: ${info}.`;
        }
        
        prompt += ` Максимум 100 символов, на русском языке.`;
        
        return prompt;
    }

    buildMultipleGiftIdeasPrompt(name, info, count) {
        let prompt = `Предложи ${count} разных идей подарков для ${name}.`;
        
        if (info) {
            prompt += ` Информация: ${info}.`;
        }
        
        prompt += ` Каждая идея на новой строке с эмодзи. Максимум 300 символов, на русском языке.`;
        
        return prompt;
    }

    formatMultipleGiftIdeas(response, count) {
        // Разбиваем ответ на строки и форматируем
        const lines = response.split('\n').filter(line => line.trim());
        const formattedIdeas = lines.slice(0, count).map((line, index) => {
            const cleanLine = line.trim();
            // Если строка не начинается с эмодзи, добавляем его
            if (!/^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(cleanLine)) {
                const giftEmojis = ['🎁', '🎂', '🎈', '🌸', '📚', '🎵', '🏠', '☕', '🍫', '🎨'];
                return `${giftEmojis[index % giftEmojis.length]} ${cleanLine}`;
            }
            return cleanLine;
        });
        
        return formattedIdeas.join('\n');
    }

    getDefaultCongratulations(name) {
        const congratulations = [
            `🎉 ${name}, с днем рождения! Здоровья, счастья и исполнения мечтаний! 🎂`,
            `🎈 ${name}, поздравляю! Пусть год будет счастливым и успешным! 🎁`,
            `🌟 ${name}, с днем рождения! Радости, любви и вдохновения! ✨`
        ];
        
        return congratulations[Math.floor(Math.random() * congratulations.length)];
    }

    getDefaultGiftIdea(name) {
        const giftIdeas = [
            `🎁 Книга - универсальный подарок для ${name}`,
            `🌸 Цветы - классический подарок для ${name}`,
            `🍰 Торт - сладкий подарок для ${name}`,
            `🎵 Музыкальный подарок для ${name}`,
            `🏠 Домашний декор для ${name}`
        ];
        
        return giftIdeas[Math.floor(Math.random() * giftIdeas.length)];
    }

    getDefaultMultipleGiftIdeas(name, count = 3) {
        const allGiftIdeas = [
            `🎁 Книга - универсальный подарок`,
            `🌸 Цветы - классический подарок`,
            `🍰 Торт - сладкий подарок`,
            `🎵 Музыкальный подарок`,
            `🏠 Домашний декор`,
            `☕ Подарочный сертификат в кафе`,
            `🎨 Набор для творчества`,
            `🍫 Шоколадный набор`,
            `📱 Аксессуар для телефона`,
            `🧸 Мягкая игрушка`,
            `💄 Косметика`,
            `👕 Одежда`,
            `🏃‍♀️ Спортивные товары`,
            `🎮 Игры и развлечения`,
            `🌱 Комнатное растение`
        ];
        
        // Перемешиваем массив и берем нужное количество
        const shuffled = allGiftIdeas.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count).join('\n');
    }

    // Дополнительный метод для генерации более персонализированных поздравлений
    async generatePersonalizedMessage(name, info, messageType = 'congratulations') {
        try {
            if (!this.apiKey) {
                return messageType === 'congratulations' 
                    ? this.getDefaultCongratulations(name)
                    : this.getDefaultGiftIdea(name);
            }

            const systemPrompt = messageType === 'congratulations' 
                ? "Ты помощник для создания персонализированных поздравлений с днем рождения. Отвечай только на русском языке, будь дружелюбным и искренним. Максимум 100 символов."
                : "Ты помощник для предложения идей подарков на день рождения. Отвечай только на русском языке, будь креативным и практичным. Предложи 1 идею подарка. Максимум 100 символов.";

            const userPrompt = messageType === 'congratulations'
                ? this.buildCongratulationsPrompt(name, info)
                : this.buildGiftIdeaPrompt(name, info);

            const response = await this.callDeepSeek(userPrompt, systemPrompt);

            return this.truncateText(response, 100);

        } catch (error) {
            console.error(`Error generating ${messageType}:`, error);
            return messageType === 'congratulations' 
                ? this.getDefaultCongratulations(name)
                : this.getDefaultGiftIdea(name);
        }
    }
}