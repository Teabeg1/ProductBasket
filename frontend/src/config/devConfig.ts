export interface DevProfile {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Member';
  familyId: string;
  familyName: string;
  inviteCode: string;
}

export const IS_DEV_MODE = true;

// Предустановленные мок-профили для быстрого локального тестирования
export const DEV_PROFILES: Record<'admin1' | 'member2', DevProfile> = {
  admin1: {
    id: 'user-ivan-admin',
    name: 'Иван',
    email: 'ivan@mail.ru',
    role: 'Admin',
    familyId: 'fam-67',
    familyName: 'Семья 67',
    inviteCode: 'FAM-8492',
  },
  member2: {
    id: 'user-elena-member',
    name: 'Елена',
    email: 'elena@mail.ru',
    role: 'Member',
    familyId: 'fam-67',
    familyName: 'Семья 67',
    inviteCode: 'FAM-8492',
  },
};

// Список экранов для быстрого перехода в меню разработчика
export const DEV_SCREENS = [
  { id: 'Login', title: 'Frame 5: Вход в аккаунт' },
  { id: 'Register', title: 'Frame 6: Регистрация' },
  { id: 'ForgotPassword', title: 'Восстановление пароля' },
  { id: 'Onboarding', title: 'Frame 7: Семейная группа' },
  { id: 'Cart', title: 'Frame 1: Корзина (каталог)' },
  { id: 'Roles', title: 'Frame 2: Моя семья (роли)' },
  { id: 'Events', title: 'Frame 3: Мероприятия' },
  { id: 'Settings', title: 'Frame 4: Настройки' },
  { id: 'AdvancedSettings', title: 'Frame 8: Расширенные настройки' },
  { id: 'ModalCreateEvent', title: 'Frame 9: Модалка создания события' },
  { id: 'ModalAddFamily', title: 'Frame 10: Модалка добавления в семью' },
] as const;
