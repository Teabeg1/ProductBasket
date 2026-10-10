export const Colors = {
  primary: '#FF3360',           // Фирменный розовый Samokat
  primaryLight: '#FFF0F4',      // Светло-розовая подложка логотипа
  background: '#F4F6F8',        // Фон мобильного приложения
  card: '#FFFFFF',              // Фон карточек и полей
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
} as const;

export const Typography = {
  titleLarge: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.textDark,
    letterSpacing: -0.5,
  },
  titleMedium: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textDark,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
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
