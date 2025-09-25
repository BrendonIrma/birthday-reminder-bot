# 🔄 Миграция данных в Supabase

## Из существующего Python бота

Если у вас есть данные в старом Python боте, используйте этот скрипт для экспорта:

```python
# export_data.py
import os
import json
from datetime import datetime
from sqlalchemy import create_engine, text

# Подключение к старой базе данных
engine = create_engine('sqlite:///birthdays.db')

with engine.connect() as conn:
    result = conn.execute(text("SELECT * FROM birthdays"))
    birthdays = result.fetchall()

# Экспорт данных
data = []
for birthday in birthdays:
    data.append({
        'chat_id': birthday[1],  # chat_id
        'name': birthday[2],     # name
        'birth_date': birthday[3].strftime('%Y-%m-%d') if birthday[3] else None,  # birth_date
        'info': birthday[4] if len(birthday) > 4 else None  # description/info
    })

with open('birthdays_export.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Exported {len(data)} birthdays to birthdays_export.json")
```

## Импорт в Supabase

После экспорта данных, используйте этот скрипт для импорта в Supabase:

```javascript
// import_data.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function importData() {
    try {
        // Читаем экспортированные данные
        const data = JSON.parse(fs.readFileSync('birthdays_export.json', 'utf8'));
        
        console.log(`Importing ${data.length} birthdays...`);
        
        // Импортируем данные пакетами по 100 записей
        const batchSize = 100;
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            const { data: result, error } = await supabase
                .from('birthdays')
                .insert(batch);
            
            if (error) {
                console.error(`Error importing batch ${i}-${i + batchSize}:`, error);
            } else {
                console.log(`Imported batch ${i}-${i + batchSize}: ${result.length} records`);
            }
        }
        
        console.log('Import completed successfully!');
        
    } catch (error) {
        console.error('Import failed:', error);
    }
}

importData();
```

## Прямая миграция из SQLite

Если у вас есть доступ к SQLite файлу старого бота:

```bash
# Установите sqlite3 если не установлен
# sudo apt-get install sqlite3

# Экспорт данных в CSV
sqlite3 old_birthdays.db -header -csv "SELECT chat_id, name, birth_date, description as info FROM birthdays;" > birthdays.csv

# Затем используйте CSV для импорта в Supabase через веб-интерфейс
```

## Проверка миграции

После импорта проверьте данные в Supabase:

```sql
-- Проверка количества записей
SELECT COUNT(*) FROM birthdays;

-- Проверка по пользователям
SELECT chat_id, COUNT(*) as birthday_count 
FROM birthdays 
GROUP BY chat_id 
ORDER BY birthday_count DESC;

-- Проверка дат
SELECT name, birth_date, info 
FROM birthdays 
ORDER BY birth_date 
LIMIT 10;
```

## Очистка старых данных

После успешной миграции можно удалить старые файлы:

```bash
# Удаление старой базы данных SQLite
rm birthdays.db

# Удаление экспортированных файлов
rm birthdays_export.json
rm birthdays.csv
```

## Автоматическая миграция

Для автоматической миграции создайте скрипт:

```bash
#!/bin/bash
# migrate.sh

echo "Starting migration..."

# 1. Экспорт из старой базы
python3 export_data.py

# 2. Импорт в Supabase
node import_data.js

# 3. Проверка
echo "Migration completed. Check your Supabase dashboard."

# 4. Очистка
read -p "Delete export files? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm birthdays_export.json
    echo "Export files deleted."
fi
```

Сделайте скрипт исполняемым:

```bash
chmod +x migrate.sh
./migrate.sh
```

## Troubleshooting

### Ошибка "duplicate key value violates unique constraint"

Если получаете ошибку дублирования, сначала очистите таблицу:

```sql
-- ОСТОРОЖНО: Это удалит все данные!
TRUNCATE TABLE birthdays;
```

### Ошибка "invalid input syntax for type date"

Проверьте формат дат в экспортированных данных. Должен быть YYYY-MM-DD.

### Ошибка "value too long for type character varying(255)"

Имя слишком длинное. Обрежьте до 255 символов:

```javascript
// В скрипте импорта
data.forEach(item => {
    if (item.name && item.name.length > 255) {
        item.name = item.name.substring(0, 255);
    }
});
```