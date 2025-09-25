# 🐳 Деплой через Docker

## Варианты деплоя с Docker

### 1. Railway (Рекомендуется) - БЕСПЛАТНО

1. **Перейдите на [railway.app](https://railway.app)**
2. **Войдите через GitHub**
3. **"New Project" → "Deploy from GitHub repo"**
4. **Выберите `birthday-reminder-bot`**
5. **Railway автоматически обнаружит Dockerfile**
6. **Добавьте переменные окружения:**
   - `TELEGRAM_BOT_TOKEN` = ваш токен бота
   - `DEEPSEEK_API_KEY` = ваш ключ DeepSeek  
   - `SUPABASE_URL` = ваш URL Supabase
   - `SUPABASE_ANON_KEY` = ваш ключ Supabase
7. **"Deploy"**

### 2. Fly.io - БЕСПЛАТНО (с ограничениями)

1. **Установите Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Войдите в аккаунт:**
   ```bash
   fly auth login
   ```

3. **Деплой:**
   ```bash
   fly launch
   ```

4. **Добавьте переменные окружения:**
   ```bash
   fly secrets set TELEGRAM_BOT_TOKEN=ваш_токен
   fly secrets set DEEPSEEK_API_KEY=ваш_ключ
   fly secrets set SUPABASE_URL=ваш_url
   fly secrets set SUPABASE_ANON_KEY=ваш_ключ
   ```

### 3. Render - БЕСПЛАТНО

1. **Перейдите на [render.com](https://render.com)**
2. **"New" → "Web Service"**
3. **Подключите GitHub репозиторий**
4. **Настройки:**
   - **Environment**: Docker
   - **Dockerfile Path**: `./Dockerfile`
5. **Добавьте переменные окружения**
6. **"Create Web Service"**

### 4. DigitalOcean App Platform - БЕСПЛАТНО

1. **Перейдите на [cloud.digitalocean.com](https://cloud.digitalocean.com)**
2. **"Create" → "Apps"**
3. **"GitHub" → выберите репозиторий**
4. **Настройки:**
   - **Source Type**: Docker
   - **Dockerfile Path**: `./Dockerfile`
5. **Добавьте переменные окружения**
6. **"Create Resources"**

## Преимущества Docker деплоя

- ✅ **Консистентность**: Одинаковая среда везде
- ✅ **Портабельность**: Легко переносить между платформами
- ✅ **Изоляция**: Все зависимости в контейнере
- ✅ **Масштабируемость**: Легко масштабировать
- ✅ **Отладка**: Легче отлаживать проблемы

## Проверка работы

После деплоя:
1. Найдите вашего бота в Telegram
2. Отправьте `/start`
3. Добавьте день рождения
4. Бот должен работать 24/7!

## Мониторинг

- **Railway**: Dashboard → Logs
- **Fly.io**: `fly logs`
- **Render**: Dashboard → Logs
- **DigitalOcean**: Dashboard → Runtime Logs