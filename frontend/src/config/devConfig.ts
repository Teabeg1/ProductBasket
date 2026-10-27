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

// Пустой пользователь по умолчанию (чистое состояние до авторизации)
export const EMPTY_USER: DevUser = {
  id: '',
  name: '',
  email: '',
  familyId: null,
  familyName: null,
  avatarChar: '?',
  avatarBg: '#E0E7FF',
  avatarColor: '#3730A3',
};
