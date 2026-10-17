import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, Mail, Lock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { Colors, Typography } from '../constants/theme';
import { AuthService } from '../services/api';
import { useApp } from '../context/AppContext';
import type { AuthNavigationProp } from '../navigation/types';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const { setCurrentUserByEmail, colors } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Введите email или телефон';
    } else if (!email.includes('@') && email.length < 10) {
      newErrors.email = 'Некорректный формат email или телефона';
    }

    if (!password) {
      newErrors.password = 'Введите пароль';
    } else if (password.length < 6) {
      newErrors.password = 'Пароль должен быть не менее 6 символов';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      try {
        await AuthService.login({ email, password });
      } catch (netErr) {
        console.log('[Авторизация]: активен локальный режим (бэкенд офлайн)');
        await new Promise((resolve) => setTimeout(resolve, 300));
        await AuthService.saveToken('mock_jwt_token_' + Date.now());
      }

      // Устанавливаем пользователя по email и проверяем наличие семьи
      const { hasFamily } = setCurrentUserByEmail(email);

      if (hasFamily) {
        navigation.navigate('Main');
      } else {
        navigation.navigate('Onboarding');
      }
    } catch (e: any) {
      Alert.alert('Ошибка входа', e.message || 'Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Верхний логотип */}
          <View style={[styles.logoBadge, { backgroundColor: colors.primaryLight }]}>
            <ShoppingBag size={28} color={colors.primary} strokeWidth={2.3} />
          </View>

          {/* Заголовки */}
          <Text style={[styles.title, { color: colors.textDark }]}>Вход в аккаунт</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Синхронизируйте покупки с группой
          </Text>

          {/* Форма ввода */}
          <View style={styles.form}>
            <AppInput
              label="Email или телефон"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="ivan@mail.ru"
              leftIcon={<Mail size={18} color={colors.textMuted} />}
              keyboardType="email-address"
              error={errors.email}
              autoCapitalize="none"
            />

            <AppInput
              label="Пароль"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="Введите пароль"
              leftIcon={<Lock size={18} color={colors.textMuted} />}
              isPassword
              error={errors.password}
            />

            {/* Ссылка: Забыли пароль? */}
            <TouchableOpacity
              style={styles.forgotPasswordWrapper}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.blue }]}>
                Забыли пароль?
              </Text>
            </TouchableOpacity>

            {/* Кнопка Войти */}
            <AppButton
              title="Войти"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />
          </View>

          {/* Футер: Нет аккаунта? Зарегистрироваться */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Нет аккаунта?{' '}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={[styles.registerLink, { color: colors.primary }]}>
                Зарегистрироваться
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    flexGrow: 1,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    ...Typography.titleLarge,
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.body,
    marginBottom: 18,
  },
  form: {
    width: '100%',
  },
  forgotPasswordWrapper: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -2,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 24,
    paddingBottom: 12,
  },
  footerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
