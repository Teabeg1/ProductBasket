# Архитектурный контракт и модели данных: «Совместная корзина продуктов» (ProductBasket)

Документация для серверной разработки (ASP.NET Core 8 / 9 + PostgreSQL + SignalR) и клиентского мобильного приложения (React Native + TypeScript + Expo).

---

## 1. Реляционная схема базы данных (PostgreSQL)

```sql
-- 1. Таблица пользователей
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Таблица семей (групп совместных покупок)
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL, -- например "Семья 67"
    invite_code VARCHAR(16) UNIQUE NOT NULL, -- например "FAM-8492"
    creator_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Связь участников с семьями и их роли
CREATE TYPE family_role AS ENUM ('Admin', 'Member');

CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role family_role NOT NULL DEFAULT 'Member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_family_user UNIQUE (family_id, user_id)
);

-- 4. Справочник товаров (каталог товаров)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL, -- например "Молоко"
    unit VARCHAR(100) NOT NULL,  -- например "930 мл • 3.2%"
    category VARCHAR(100) NOT NULL DEFAULT 'Продукты',
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Позиции в корзине семьи
CREATE TYPE item_status AS ENUM ('Pending', 'Taken', 'Purchased');

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INT NOT NULL DEFAULT 1,
    status item_status NOT NULL DEFAULT 'Pending',
    taken_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Мероприятия (праздники и события семьи)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL, -- например "День рождения Кости", "Новый Год"
    event_date DATE NOT NULL,
    icon VARCHAR(10) NOT NULL DEFAULT '🎉', -- эмодзи иконка (🎂, 🎃, 🎄, 🥂, 🍕, 🎈)
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 2. Спецификация REST API

Базовый префикс: `/api`

### А. Авторизация и аккаунт (`/api/auth`)
* `POST /api/auth/register` (Frame 6)
  * **Тело запроса**:
    ```json
    {
      "displayName": "Иван",
      "email": "ivan@mail.ru",
      "password": "strongPassword123"
    }
    ```
  * **Ответ (201 Created)**:
    ```json
    {
      "token": "eyJhbGciOi...",
      "user": {
        "id": "7f130b05-a86d-4952-b918-2e38c353d100",
        "displayName": "Иван",
        "email": "ivan@mail.ru"
      }
    }
    ```

* `POST /api/auth/login` (Frame 5)
  * **Тело запроса**:
    ```json
    {
      "email": "ivan@mail.ru",
      "password": "strongPassword123"
    }
    ```
  * **Ответ (200 OK)**:
    ```json
    {
      "token": "eyJhbGciOi...",
      "user": {
        "id": "7f130b05-a86d-4952-b918-2e38c353d100",
        "displayName": "Иван",
        "email": "ivan@mail.ru",
        "familyId": "4c4314cb-20fa-40ab-9e5d-d9b897e68fa7"
      }
    }
    ```

* `POST /api/auth/change-password` (Frame 8)
  * **Заголовки**: `Authorization: Bearer <token>`
  * **Тело запроса**: `{ "oldPassword": "...", "newPassword": "..." }`
  * **Ответ (200 OK)**: `{ "success": true }`

* `DELETE /api/auth/account` (Frame 8)
  * **Заголовки**: `Authorization: Bearer <token>`
  * **Ответ (200 OK)**: `{ "message": "Account deleted successfully" }`

---

### Б. Семья и онбординг (`/api/family`)
* `POST /api/family/create` (Frame 7, создание семьи)
  * **Тело запроса**: `{ "name": "Семья 67" }`
  * **Ответ (201 Created)**:
    ```json
    {
      "familyId": "4c4314cb-20fa-40ab-9e5d-d9b897e68fa7",
      "name": "Семья 67",
      "inviteCode": "FAM-8492",
      "role": "Admin"
    }
    ```

* `POST /api/family/join` (Frame 7, вход по коду)
  * **Тело запроса**: `{ "inviteCode": "FAM-8492" }`
  * **Ответ (200 OK)**:
    ```json
    {
      "familyId": "4c4314cb-20fa-40ab-9e5d-d9b897e68fa7",
      "familyName": "Семья 67",
      "role": "Member"
    }
    ```

* `GET /api/family/members` (Frame 4)
  * **Ответ (200 OK)**:
    ```json
    [
      { "id": "uuid-1", "displayName": "Иван", "role": "Admin", "isCurrentUser": true },
      { "id": "uuid-2", "displayName": "Елена", "role": "Member", "isCurrentUser": false },
      { "id": "uuid-3", "displayName": "Илья", "role": "Member", "isCurrentUser": false }
    ]
    ```

* `POST /api/family/leave` (Frame 4, выход из семьи)
  * **Ответ (200 OK)**: `{ "success": true }`

---

### В. Корзина и товары (`/api/cart`)
* `GET /api/cart` (Frame 1 и Frame 2)
  * **Ответ (200 OK)**:
    ```json
    [
      {
        "id": "c1",
        "productId": "p1",
        "title": "Молоко",
        "unit": "930 мл • 3.2%",
        "imageUrl": "...",
        "status": "Taken",
        "takenByUserId": "uuid-ivan",
        "takenByName": "Иван"
      },
      {
        "id": "c2",
        "productId": "p2",
        "title": "Макароны",
        "unit": "450 г • Перья",
        "imageUrl": "...",
        "status": "Pending",
        "takenByUserId": null,
        "takenByName": null
      }
    ]
    ```

* `POST /api/cart/{id}/take` — действие «Куплю я»
  * **Ответ (200 OK)**: обновленный статус позиции.

* `POST /api/cart/{id}/release` — отказаться от покупки (сделать статус `Pending`).

---

### Г. Мероприятия (`/api/events`)
* `GET /api/events` (Frame 3)
  * **Ответ (200 OK)**:
    ```json
    [
      {
        "id": "e1",
        "title": "День рождения Кости",
        "eventDate": "2026-10-05",
        "icon": "🎂",
        "membersCount": 6
      },
      {
        "id": "e2",
        "title": "Хеллоуин",
        "eventDate": "2026-10-31",
        "icon": "🎃",
        "membersCount": 8
      }
    ]
    ```

* `POST /api/events` (Frame 9, создание мероприятия)
  * **Тело запроса**:
    ```json
    {
      "title": "Новый Год",
      "eventDate": "2026-12-31",
      "icon": "🎄"
    }
    ```
  * **Ответ (201 Created)**: созданный объект события.

* `DELETE /api/events/{id}` (Frame 3, удаление мероприятия).

---

## 3. Спецификация Real-Time (SignalR Hub)

* **URL хаба**: `wss://your-domain.com/hubs/cart`
* **Авторизация**: Заголовок `Authorization: Bearer <jwt_token>`
* **Авто-группировка**:
  При подключении хаб добавляет сокет в группу семьи:
  ```csharp
  public override async Task OnConnectedAsync()
  {
      var familyId = Context.User.FindFirst("FamilyId")?.Value;
      if (!string.IsNullOrEmpty(familyId))
      {
          await Groups.AddToGroupAsync(Context.ConnectionId, familyId);
      }
      await base.OnConnectedAsync();
  }
  ```

### События:
1. **Клиент вызывает**:
   * `hubConnection.invoke("TakeProduct", cartItemId)`
   * `hubConnection.invoke("ReleaseProduct", cartItemId)`
2. **Сервер транслирует всем в семье**:
   * Метод: `ProductStatusChanged`
   * Полезная нагрузка (Payload):
     ```json
     {
       "cartItemId": "c1",
       "productId": "p1",
       "status": "Taken",
       "takenByUserId": "uuid-ivan",
       "takenByName": "Иван"
     }
     ```
3. **Реакция на клиенте (React Native)**:
   При получении `ProductStatusChanged` мобильное приложение мгновенно обновляет локальный стейт карточки товара без запроса к API и без перезагрузки экрана.
