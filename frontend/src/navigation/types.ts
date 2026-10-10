import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Onboarding: undefined; // Frame 7: Выбор семьи
  Main: undefined;       // Таббар с корзиной
};

export type AuthNavigationProp = NativeStackNavigationProp<RootStackParamList>;
