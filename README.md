# Совместная корзина продуктов (ProductBasket)

Комплексный дипломный проект мобильного сервиса совместных семейных покупок продуктов в реальном времени.

---

## Архитектура проекта (Monorepo)

```text
ProductBasket/
├── frontend/          # Мобильное приложение (React Native + TypeScript + Expo)
├── backend/           # Серверное Web API (ASP.NET Core + PostgreSQL + SignalR)
└── docs/              # Архитектурный контракт API, схема БД, ТЗ
    └── API_CONTRACT.md
```

---

## Стек технологий

* **Мобильный клиент (`/frontend`)**:
  * React Native (Expo)
  * TypeScript
  * React Navigation (Native Stack)
  * Lucide Icons / Expo Vector Icons
  * SignalR Client (`@microsoft/signalr`)
  * Безопасное хранение токенов (`expo-secure-store`)

* **Сервер (`/backend`)**:
  * ASP.NET Core 8 / 9 Web API
  * C#
  * PostgreSQL
  * Entity Framework Core
  * ASP.NET Core SignalR
  * JWT Authentication

---

## Запуск проекта

### 1. Запуск мобильного приложения (Frontend)
```bash
cd frontend
npm install
npx expo start
```
Сканируйте QR-код в приложении **Expo Go** на телефоне (iOS / Android) или нажмите `w` для запуска в браузере.

### 2. Запуск сервера (Backend)
```bash
cd backend
dotnet restore
dotnet run
```
API будет доступно по адресу `http://localhost:5000` (Swagger UI: `http://localhost:5000/swagger`).
