# REST API Документация - Birthday Bot

## 1. Получение всех дней рождения пользователя

**GET /v1/users/{userId}/birthdays**

Получение всех дней рождения определенного пользователя

### Request

| Название параметра | Тип данных | Находится в | Описание | Обязательность параметра |
|:------------------|:----------:|:-----------:|:--------|:----------------------:|
| userId | int | path | Уникальный идентификатор пользователя (chat_id) | да |

### Response

| Название параметра | Тип данных | Находится в | Описание | Обязательность параметра |
|:------------------|:----------:|:-----------:|:--------|:----------------------:|
| userId | int | body | Уникальный идентификатор пользователя | да |
| birthdays | array | body | Массив дней рождения | да |
| birthday | object | body | Объект дня рождения | нет |
| id | int | body | Уникальный идентификатор дня рождения | да |
| name | string | body | Имя человека | да |
| birth_date | string | body | Дата рождения (YYYY-MM-DD) | да |
| info | string | body | Дополнительная информация о человеке | нет |
| created_at | string | body | Дата создания записи | да |
| updated_at | string | body | Дата последнего обновления | да |

**Response code: 200**

---

## 2. Добавление нового дня рождения

**POST /v1/users/{userId}/birthdays**

Добавление нового дня рождения для пользователя

### Request

| Название параметра | Тип данных | Находится в | Описание | Обязательность параметра |
|:------------------|:----------:|:-----------:|:--------|:----------------------:|
| userId | int | path | Уникальный идентификатор пользователя (chat_id) | да |
| name | string | body | Имя человека | да |
| birth_date | string | body | Дата рождения (YYYY-MM-DD) | да |
| info | string | body | Дополнительная информация о человеке | нет |

### Response

| Название параметра | Тип данных | Находится в | Описание | Обязательность параметра |
|:------------------|:----------:|:-----------:|:--------|:----------------------:|
| success | boolean | body | Статус операции | да |
| birthday_id | int | body | Уникальный идентификатор созданного дня рождения | да |
| message | string | body | Сообщение о результате операции | да |

**Response code: 201**

---

## 3. Обновление дня рождения

**PUT /v1/users/{userId}/birthdays/{birthdayId}**

Обновление существующего дня рождения

### Request

| Название параметра | Тип данных | Находится в | Описание | Обязательность параметра |
|:------------------|:----------:|:-----------:|:--------|:----------------------:|
| userId | int | path | Уникальный идентификатор пользователя (chat_id) | да |
| birthdayId | int | path | Уникальный идентификатор дня рождения | да |
| name | string | body | Имя человека | да |
| birth_date | string | body | Дата рождения (YYYY-MM-DD) | да |
| info | string | body | Дополнительная информация о человеке | нет |

### Response

| Название параметра | Тип данных | Находится в | Описание | Обязательность параметра |
|:------------------|:----------:|:-----------:|:--------|:----------------------:|
| success | boolean | body | Статус операции | да |
| message | string | body | Сообщение о результате операции | да |

**Response code: 200**

---

## 4. Удаление дня рождения

**DELETE /v1/users/{userId}/birthdays/{birthdayId}**

Удаление дня рождения

### Request

| Название параметра | Тип данных | Находится в | Описание | Обязательность параметра |
|:------------------|:----------:|:-----------:|:--------|:----------------------:|
| userId | int | path | Уникальный идентификатор пользователя (chat_id) | да |
| birthdayId | int | path | Уникальный идентификатор дня рождения | да |

### Response

| Название параметра | Тип данных | Находится в | Описание | Обязательность параметра |
|:------------------|:----------:|:-----------:|:--------|:----------------------:|
| success | boolean | body | Статус операции | да |
| message | string | body | Сообщение о результате операции | да |

**Response code: 200**

---

## 5. Получение конкретного дня рождения

**GET /v1/users/{userId}/birthdays/{birthdayId}**

Получение информации о конкретном дне рождения

### Request

| Название параметра | Тип данных | Находится в | Описание | Обязательность параметра |
|:------------------|:----------:|:-----------:|:--------|:----------------------:|
| userId | int | path | Уникальный идентификатор пользователя (chat_id) | да |
| birthdayId | int | path | Уникальный идентификатор дня рождения | да |

### Response

| Название параметра | Тип данных | Находится в | Описание | Обязательность параметра |
|:------------------|:----------:|:-----------:|:--------|:----------------------:|
| id | int | body | Уникальный идентификатор дня рождения | да |
| name | string | body | Имя человека | да |
| birth_date | string | body | Дата рождения (YYYY-MM-DD) | да |
| info | string | body | Дополнительная информация о человеке | нет |
| created_at | string | body | Дата создания записи | да |
| updated_at | string | body | Дата последнего обновления | да |

**Response code: 200**

---

## 6. Получение статистики пользователя

**GET /v1/users/{userId}/stats**

Получение статистики по дням рождения пользователя

### Request

| Название параметра | Тип данных | Находится в | Описание | Обязательность параметра |
|:------------------|:----------:|:-----------:|:--------|:----------------------:|
| userId | int | path | Уникальный идентификатор пользователя (chat_id) | да |

### Response

| Название параметра | Тип данных | Находится в | Описание | Обязательность параметра |
|:------------------|:----------:|:-----------:|:--------|:----------------------:|
| total_birthdays | int | body | Общее количество дней рождения | да |
| upcoming_birthdays | int | body | Количество предстоящих дней рождения | да |
| today_birthdays | int | body | Количество дней рождения сегодня | да |
| this_month_birthdays | int | body | Количество дней рождения в этом месяце | да |

**Response code: 200**

---

## 7. Тестирование системы напоминаний

**POST /v1/admin/test-reminders**

Запуск тестовой проверки системы напоминаний (только для администраторов)

### Request

| Название параметра | Тип данных | Находится в | Описание | Обязательность параметра |
|:------------------|:----------:|:-----------:|:--------|:----------------------:|
| api_key | string | header | API ключ для авторизации | да |

### Response

| Название параметра | Тип данных | Находится в | Описание | Обязательность параметра |
|:------------------|:----------:|:-----------:|:--------|:----------------------:|
| success | boolean | body | Статус операции | да |
| reminders_sent | int | body | Количество отправленных напоминаний | да |
| message | string | body | Сообщение о результате операции | да |

**Response code: 200**

---

## Коды ошибок

| Код | Описание |
|:---:|:--------|
| 400 | Неверный запрос |
| 401 | Не авторизован |
| 403 | Доступ запрещен |
| 404 | Ресурс не найден |
| 409 | Конфликт данных |
| 500 | Внутренняя ошибка сервера |

---

## Примеры использования

### Получение всех дней рождения
```bash
curl -X GET "https://api.birthdaybot.com/v1/users/123456789/birthdays" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Добавление нового дня рождения
```bash
curl -X POST "https://api.birthdaybot.com/v1/users/123456789/birthdays" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "name": "Анна",
    "birth_date": "1990-03-15",
    "info": "Моя сестра"
  }'
```

### Обновление дня рождения
```bash
curl -X PUT "https://api.birthdaybot.com/v1/users/123456789/birthdays/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "name": "Анна Петрова",
    "birth_date": "1990-03-15",
    "info": "Моя сестра, любит рисовать"
  }'
```

### Удаление дня рождения
```bash
curl -X DELETE "https://api.birthdaybot.com/v1/users/123456789/birthdays/1" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Дополнительные улучшения для лучшей видимости границ

Для еще более четких границ столбцов в некоторых Markdown редакторах можно использовать HTML таблицы:

### Пример HTML таблицы (альтернативный формат)

<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
<thead>
<tr style="background-color: #f2f2f2;">
<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Название параметра</th>
<th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Тип данных</th>
<th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Находится в</th>
<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Описание</th>
<th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Обязательность</th>
</tr>
</thead>
<tbody>
<tr>
<td style="border: 1px solid #ddd; padding: 8px;">userId</td>
<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">int</td>
<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">path</td>
<td style="border: 1px solid #ddd; padding: 8px;">Уникальный идентификатор пользователя</td>
<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">да</td>
</tr>
<tr>
<td style="border: 1px solid #ddd; padding: 8px;">name</td>
<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">string</td>
<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">body</td>
<td style="border: 1px solid #ddd; padding: 8px;">Имя человека</td>
<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">да</td>
</tr>
</tbody>
</table>