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