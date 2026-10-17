import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Onboarding: undefined; // Frame 7: Выбор группы
  Main: undefined;       // Таббар с корзиной
  AdvancedSettings: undefined; // Frame 8: Расширенные настройки
};

export type AuthNavigationProp = NativeStackNavigationProp<RootStackParamList>;
