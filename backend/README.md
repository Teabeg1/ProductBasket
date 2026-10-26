# 🛒 Бэкенд ProductBasket (ASP.NET Core 8 + PostgreSQL + SignalR)

Серверная часть для мобильного приложения **«Совместная корзина продуктов» (ProductBasket)**.

---

## 🚀 Стек технологий
- **Платформа**: .NET 8 / C#
- **Фреймворк**: ASP.NET Core Web API
- **ORM / База данных**: Entity Framework Core 8 + PostgreSQL (Npgsql)
- **Аутентификация**: JWT Bearer + BCrypt (хеширование паролей)
- **Real-Time синхронизация**: ASP.NET Core SignalR (хаб `/hubs/cart`)
- **Документация и тестирование API**: Swagger UI (OpenAPI)
- **Тесты**: xUnit + Microsoft.AspNetCore.Mvc.Testing (17 комплексных интеграционных тестов)

---

## 📁 Структура проекта

```
backend/
├── Controllers/              # Контроллеры REST API
│   ├── AuthController.cs     # Регистрация, логин, смена пароля, удаление аккаунта
│   ├── FamilyController.cs   # Создание семьи, вход по 6-значному коду, участники, выход
│   ├── CartController.cs     # Добавление/удаление товаров, «Куплю я», отметка «Куплено»
│   ├── EventsController.cs   # Мероприятия, отдельные корзины праздников, завершение
│   └── ProductsController.cs # Каталог базовых товаров и пользовательские товары семьи
├── Data/
│   ├── AppDbContext.cs       # Контекст EF Core, связи, каскадные правила
│   └── DbInitializer.cs      # Первичное наполнение каталога (молоко, яблоки, сыр...)
├── Dtos/                     # Модели запросов и ответов (Data Transfer Objects)
├── Hubs/
│   └── CartHub.cs            # SignalR вебсокет-хаб для мгновенного обновления корзины
├── Models/                   # Сущности БД (User, Family, CartItem, Event, Product)
├── Services/
│   └── TokenService.cs       # Генерация и валидация JWT токенов
├── Migrations/               # Миграции Entity Framework Core для PostgreSQL
├── ProductBasket.Tests/      # Автоматические тесты (xUnit)
├── schema.sql                # Готовый SQL-скрипт создания схемы базы данных
├── appsettings.json          # Конфигурация БД (строка подключения) и JWT
├── ProductBasket.sln         # Файл решения для Visual Studio
└── ProductBasket.Api.csproj  # Файл проекта Web API
```

---

## 🛠 Быстрый старт в Visual Studio

### 1. Открытие проекта
1. Запустите **Visual Studio**.
2. Выберите **«Открыть проект или решение»** (`Open a project or solution`).
3. Выберите файл:
   `c:\Users\Viper\Desktop\mobile\ProductBasket\backend\ProductBasket.sln`

### 2. Настройка подключения к PostgreSQL
Откройте файл `appsettings.json` и при необходимости введите пароль от вашего локального PostgreSQL:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=productbasket;Username=postgres;Password=ВАШ_ПАРОЛЬ"
}
```

> 💡 **Автоматическое создание базы данных**:  
> При первом запуске приложения сервер сам автоматически создаст базу данных `productbasket`, все таблицы и заполнит каталог базовыми товарами.  
> Также в папке `backend/` лежит файл `schema.sql`, который можно выполнить вручную в **pgAdmin** или `psql`, если требуется.

### 3. Запуск
- Нажмите клавишу **F5** (или зелёную кнопку «Запуск» в Visual Studio).
- Проект запустится на адресе **`http://localhost:5000`**.
- В браузере автоматически откроется **Swagger UI**:
  `http://localhost:5000/swagger`

---

## 🧪 Запуск автоматических тестов

В терминале (или через Test Explorer в Visual Studio):
```powershell
cd c:\Users\Viper\Desktop\mobile\ProductBasket\backend
dotnet test ProductBasket.sln
```

Все **23 теста** выполняются автономно (используют InMemory окружение) и проверяют:
- Регистрацию, вход и авторизацию пользователей по JWT.
- Редактирование профиля (`PUT /api/auth/profile`) и восстановление пароля (`/api/auth/forgot-password`, `/api/auth/reset-password`).
- Создание семейных групп и генерацию случайного 6-значного кода.
- Правило равенства участников (удаление участника и каскадную очистку товаров).
- Поведение корзины: действие «Куплю я», single-click переключение `POST /api/cart/{id}/assign`, блокировку товара от изменения другими участниками, возврат в статус «Не назначено», статус «Куплено».
- Операции по `ProductId` (уменьшение через `/decrement`, удаление, обновление).
- Изоляцию корзин мероприятий от повседневной корзины.
- Мульти-семейную видимость мероприятий (просмотр мероприятий по всем группам пользователя без фильтра).
- Строгую межсемейную изоляцию и безопасность: запрет доступа к чужим корзинам, товарам, событиям и участникам.
- Каталог продуктов и добавление пользовательских товаров.

---

## 🔌 Основные эндпоинты REST API

| Метод | Эндпоинт | Описание |
|---|---|---|
| `POST` | `/api/auth/register` | Регистрация нового пользователя |
| `POST` | `/api/auth/login` | Вход и получение JWT токена |
| `GET` | `/api/auth/me` | Данные текущего профиля |
| `PUT` | `/api/auth/profile` | Обновление отображаемого имени пользователя |
| `POST` | `/api/auth/change-password` | Смена пароля |
| `POST` | `/api/auth/forgot-password` | Запрос на восстановление пароля |
| `POST` | `/api/auth/reset-password` | Сброс пароля по коду |
| `DELETE` | `/api/auth/account` | Удаление аккаунта |
| `POST` | `/api/family/create` | Создание новой группы совместных покупок |
| `POST` | `/api/family/join` | Вступление в группу по 6-значному коду |
| `GET` | `/api/family/my` | Список всех групп текущего пользователя |
| `GET` | `/api/family/members` | Список участников группы |
| `POST` | `/api/family/leave` | Выход из группы с очисткой своих товаров |
| `DELETE` | `/api/family/members/{id}` | Удаление участника из группы (любым членом группы) |
| `PUT` | `/api/family/name` | Переименование группы |
| `GET` | `/api/cart` | Получение товаров корзины (`?eventId=` для корзины мероприятия) |
| `POST` | `/api/cart/items` | Добавление товара в корзину (по ID или названию) |
| `PUT` | `/api/cart/items/{id}` | Изменение количества товара (при 0 товар удаляется) |
| `POST` | `/api/cart/items/{id}/decrement` | Уменьшение количества товара на 1 |
| `DELETE` | `/api/cart/items/{id}` | Удаление товара из корзины (по ID позиции или ProductId) |
| `POST` | `/api/cart/{id}/assign` | **«Куплю я»** (single-click toggle: взять / снять выбор) |
| `POST` | `/api/cart/{id}/take` | Закрепление товара за собой |
| `POST` | `/api/cart/{id}/release` | Отказ от покупки (возврат в «Не назначено») |
| `POST` | `/api/cart/{id}/toggle-purchased` | Отметка статуса **«Куплено»** |
| `GET` | `/api/events` | Список мероприятий (по одной группе или всем группам) |
| `POST` | `/api/events` | Создание нового мероприятия |
| `POST` | `/api/events/{id}/cart` | Создание отдельной корзины для мероприятия |
| `POST` | `/api/events/{id}/complete` | Завершение мероприятия |
| `POST` | `/api/events/{id}/reopen` | Возобновление мероприятия |
| `DELETE` | `/api/events/{id}` | Удаление мероприятия |
| `GET` | `/api/products` | Каталог товаров (системные + кастомные) |
| `POST` | `/api/products/custom` | Добавление своего товара для семьи |
| `DELETE` | `/api/products/custom/{id}` | Удаление своего товара |

---

## ⚡ SignalR Hub (`/hubs/cart`)

Используется для мгновенной синхронизации корзины между смартфонами всех членов семьи:
- Подключение: `ws://localhost:5000/hubs/cart?access_token={JWT_TOKEN}`
- Клиентские методы: `AssignProduct(id)`, `TakeProduct(id)`, `ReleaseProduct(id)`, `TogglePurchased(id)`, `JoinFamily(familyId)`
- Серверные события:
  - `ProductStatusChanged` — изменение статуса товара (взят, освобождён, куплен)
  - `CartUpdated` — добавление/удаление позиций корзины
  - `EventCreated`, `EventCompleted`, `EventReopened`, `EventDeleted`
  - `MemberLeft`, `MemberRemoved`, `FamilyUpdated`
