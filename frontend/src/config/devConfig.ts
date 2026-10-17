export interface DevUser {
  id: string;
  name: string;
  email: string;
  familyId: string | null;
  familyName: string | null;
  avatarChar: string;
  avatarBg: string;
  avatarColor: string;
}

export const IS_DEV_MODE = false;

export type DemoStage = 1 | 2;
/**
 * 1 = Этап 1 (APK v1): чистый запуск (пустая корзина, роли, мероприятия)
 * 2 = Этап 2 (APK v2): богатый прототип (предзаполненные товары, роли, мероприятия)
 */
export const DEMO_STAGE: DemoStage = 2;

// Пользователи для локального тестирования и сценария нескольких семей
export const DEV_USERS: Record<'ivan' | 'elena' | 'denis' | 'artem' | 'danil', DevUser> = {
  ivan: {
    id: 'user-ivan',
    name: 'Иван',
    email: 'ivan@mail.ru',
    familyId: null,
    familyName: null,
    avatarChar: 'И',
    avatarBg: '#C8EF5A', // Лаймовый
    avatarColor: '#1E1C1D',
  },
  elena: {
    id: 'user-elena',
    name: 'Елена (Мама)',
    email: 'elena@mail.ru',
    familyId: null,
    familyName: null,
    avatarChar: 'Е',
    avatarBg: '#DBEAFE', // Синий
    avatarColor: '#2563EB',
  },
  denis: {
    id: 'user-denis',
    name: 'Денис (Папа)',
    email: 'denis@mail.ru',
    familyId: null,
    familyName: null,
    avatarChar: 'Д',
    avatarBg: '#FEF3C7', // Янтарный
    avatarColor: '#D97706',
  },
  artem: {
    id: 'user-artem',
    name: 'Артём (Сосед)',
    email: 'artem@mail.ru',
    familyId: null,
    familyName: null,
    avatarChar: 'А',
    avatarBg: '#E0E7FF', // Индиго
    avatarColor: '#4338CA',
  },
  danil: {
    id: 'user-danil',
    name: 'Данил (Сосед)',
    email: 'danil@mail.ru',
    familyId: null,
    familyName: null,
    avatarChar: 'Д',
    avatarBg: '#FCE7F3', // Розовый
    avatarColor: '#BE185D',
  },
};
