export type AppTheme = 'light' | 'dark';

export const LightColors = {
  primary: '#FF3360',           // Фирменный розовый Samokat
  primaryLight: '#FFF0F4',      // Светло-розовая подложка логотипа
  background: '#F4F6F8',        // Фон мобильного приложения
  card: '#FFFFFF',              // Фон карточек и полей
  cardSecondary: '#F8FAFC',
  textDark: '#14171F',          // Основной текст и заголовки
  textSecondary: '#738094',     // Подписи, плейсхолдеры
  textMuted: '#94A3B8',         // Иконки и неактивные элементы
  border: '#E2E8F0',            // Граница инпутов
  borderFocus: '#FF3360',       // Граница инпута при фокусе
  lime: '#C8EF5A',              // Лаймовый акцент
  limeDark: '#1E1C1D',
  blue: '#2563EB',              // Синий акцент (ссылки, бейджи)
  blueLight: '#EFF6FF',
  error: '#EF4444',             // Ошибки валидации
  errorLight: '#FEF2F2',
  success: '#16A34A',
  successLight: '#DCFCE7',
  statusBar: 'dark-content' as const,
};

export const DarkColors = {
  primary: '#FF3360',           // Фирменный розовый Samokat
  primaryLight: '#2A1720',      // Темно-розовая подложка
  background: '#0F172A',        // Глубокий темный фон
  card: '#1E293B',              // Карточки в темной теме
  cardSecondary: '#334155',
  textDark: '#F8FAFC',          // Основной светлый текст
  textSecondary: '#94A3B8',     // Вторичный текст
  textMuted: '#64748B',         // Приглушенный текст
  border: '#334155',            // Границы карточек
  borderFocus: '#FF3360',
  lime: '#C8EF5A',              // Лаймовый акцент
  limeDark: '#1E1C1D',
  blue: '#3B82F6',
  blueLight: '#1E293B',
  error: '#EF4444',
  errorLight: '#3B1818',
  success: '#22C55E',
  successLight: '#142F22',
  statusBar: 'light-content' as const,
};

// Экспорт по умолчанию для обратной совместимости
export const Colors = LightColors;

export const getThemeColors = (theme: AppTheme) => {
  return theme === 'dark' ? DarkColors : LightColors;
};

export const Typography = {
  titleLarge: {
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  titleMedium: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
};

export const Radii = {
  input: 14,
  button: 14,
  card: 18,
  modal: 32,
  badge: 10,
};
