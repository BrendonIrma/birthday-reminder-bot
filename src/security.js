/**
 * Модуль безопасности для Birthday Bot
 * Содержит утилиты для защиты от различных типов атак
 */
export class SecurityUtils {
    constructor() {
        this.blockedUsers = new Set(); // Заблокированные пользователи
        this.suspiciousPatterns = [
            // XSS атаки
            /<script[^>]*>.*?<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /eval\s*\(/gi,
            /function\s*\(/gi,
            
            // SQL injection (хотя используется Supabase)
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
            
            // Command injection
            /[;&|`$(){}[\]]/g,
            
            // Path traversal
            /\.\.\//g,
            /\.\.\\/g,
            
            // ReDoS атаки
            /(.)\1{100,}/g,
            
            // Спам паттерны
            /(.)\1{20,}/g,
            /(.)\1{10,}(.)\2{10,}/g
        ];
    }

    /**
     * Проверяет, заблокирован ли пользователь
     */
    isUserBlocked(chatId) {
        return this.blockedUsers.has(chatId);
    }

    /**
     * Блокирует пользователя
     */
    blockUser(chatId, reason = '') {
        this.blockedUsers.add(chatId);
        console.log(`🚫 User ${chatId} blocked. Reason: ${reason}`);
    }

    /**
     * Разблокирует пользователя
     */
    unblockUser(chatId) {
        this.blockedUsers.delete(chatId);
        console.log(`✅ User ${chatId} unblocked`);
    }

    /**
     * Проверяет сообщение на подозрительные паттерны
     */
    checkSuspiciousPatterns(text) {
        for (const pattern of this.suspiciousPatterns) {
            if (pattern.test(text)) {
                return {
                    suspicious: true,
                    pattern: pattern.toString(),
                    match: text.match(pattern)?.[0] || ''
                };
            }
        }
        return { suspicious: false };
    }

    /**
     * Проверяет, является ли сообщение спамом
     */
    isSpam(text) {
        // Проверка на повторяющиеся символы
        const repeatedChars = /(.)\1{20,}/;
        if (repeatedChars.test(text)) {
            return { isSpam: true, reason: 'repeated_characters' };
        }

        // Проверка на повторяющиеся слова
        const words = text.toLowerCase().split(/\s+/);
        const wordCount = {};
        for (const word of words) {
            wordCount[word] = (wordCount[word] || 0) + 1;
            if (wordCount[word] > 10) {
                return { isSpam: true, reason: 'repeated_words' };
            }
        }

        // Проверка на слишком много эмодзи
        const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
        if (emojiCount > 20) {
            return { isSpam: true, reason: 'too_many_emojis' };
        }

        return { isSpam: false };
    }

    /**
     * Проверяет валидность даты
     */
    isValidDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return false;
            }
            
            // Проверяем разумные границы
            const year = date.getFullYear();
            if (year < 1900 || year > 2100) {
                return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Проверяет валидность имени
     */
    isValidName(name) {
        if (!name || typeof name !== 'string') {
            return false;
        }
        
        // Длина имени
        if (name.length < 1 || name.length > 100) {
            return false;
        }
        
        // Только буквы, цифры, пробелы и кириллица
        if (!/^[a-zA-Zа-яёА-ЯЁ0-9\s]+$/.test(name)) {
            return false;
        }
        
        // Не должно быть только пробелов
        if (!name.trim()) {
            return false;
        }
        
        return true;
    }

    /**
     * Очищает текст от потенциально опасных символов
     */
    sanitizeText(text) {
        if (typeof text !== 'string') {
            return '';
        }
        
        return text
            .replace(/[<>\"'&]/g, '') // HTML/XML символы
            .replace(/[;&|`$(){}[\]]/g, '') // Command injection символы
            .replace(/\.\.\//g, '') // Path traversal
            .replace(/\.\.\\/g, '') // Path traversal (Windows)
            .replace(/\s+/g, ' ') // Нормализация пробелов
            .trim()
            .substring(0, 1000); // Ограничение длины
    }

    /**
     * Генерирует безопасный ID для callback данных
     */
    generateSafeCallbackId() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    /**
     * Проверяет валидность callback ID
     */
    isValidCallbackId(id) {
        return typeof id === 'string' && /^[a-z0-9]{26}$/.test(id);
    }

    /**
     * Логирует подозрительную активность
     */
    logSecurityEvent(chatId, username, eventType, details = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            chatId,
            username,
            eventType,
            details,
            userAgent: 'BirthdayBot/1.0'
        };
        
        console.log(`🚨 SECURITY EVENT [${timestamp}]`);
        console.log(`   Chat ID: ${chatId}`);
        console.log(`   Username: @${username || 'unknown'}`);
        console.log(`   Event: ${eventType}`);
        console.log(`   Details:`, details);
        console.log('---');
        
        // В реальном приложении здесь можно отправить в систему мониторинга
        // например, Sentry, DataDog, или собственную систему логирования
    }

    /**
     * Проверяет, не является ли запрос атакой
     */
    isAttack(text) {
        const suspicious = this.checkSuspiciousPatterns(text);
        if (suspicious.suspicious) {
            return { isAttack: true, type: 'suspicious_pattern', details: suspicious };
        }
        
        const spam = this.isSpam(text);
        if (spam.isSpam) {
            return { isAttack: true, type: 'spam', details: spam };
        }
        
        return { isAttack: false };
    }
}