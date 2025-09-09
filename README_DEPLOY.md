# 🚀 Деплой Birthday Bot в облако

## Варианты деплоя

### 1. Railway (Рекомендуется) - БЕСПЛАТНО

1. **Перейдите на [railway.app](https://railway.app)**
2. **Войдите через GitHub**
3. **Нажмите "New Project" → "Deploy from GitHub repo"**
4. **Выберите ваш репозиторий**
5. **Добавьте переменные окружения:**
   - `TELEGRAM_BOT_TOKEN` = ваш токен бота
   - `DEEPSEEK_API_KEY` = ваш ключ DeepSeek
   - `SUPABASE_URL` = ваш URL Supabase
   - `SUPABASE_ANON_KEY` = ваш ключ Supabase
6. **Нажмите "Deploy"**

### 2. Render - БЕСПЛАТНО

1. **Перейдите на [render.com](https://render.com)**
2. **Войдите через GitHub**
3. **Нажмите "New" → "Web Service"**
4. **Выберите ваш репозиторий**
5. **Настройки:**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. **Добавьте переменные окружения** (как в Railway)
7. **Нажмите "Create Web Service"**

### 3. Heroku - БЕСПЛАТНО (с ограничениями)

1. **Перейдите на [heroku.com](https://heroku.com)**
2. **Создайте новое приложение**
3. **Подключите GitHub репозиторий**
4. **Добавьте переменные окружения в Settings**
5. **Включите автоматический деплой**

## После деплоя

1. **Бот будет работать 24/7**
2. **Все пользователи Telegram смогут с ним общаться**
3. **Данные сохраняются в Supabase**
4. **Напоминания работают автоматически**

## Проверка работы

1. Найдите вашего бота в Telegram
2. Отправьте `/start`
3. Добавьте день рождения: "Тест, 9 сентября, тестовый пользователь"
4. Бот должен ответить мгновенным поздравлением!

## Мониторинг

- **Railway**: Dashboard → Logs
- **Render**: Dashboard → Logs
- **Heroku**: Dashboard → More → View logs