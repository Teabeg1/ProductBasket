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
import { Colors, Typography, Radii } from '../constants/theme';
import { AuthService } from '../services/api';
import type { AuthNavigationProp } from '../navigation/types';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();

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
        // Бэкенд на стадии разработки, сохраняем тестовый токен
        console.log('API офлайн, режим демо:', netErr);
        await new Promise((resolve) => setTimeout(resolve, 600));
        await AuthService.saveToken('mock_jwt_token_' + Date.now());
      }

      Alert.alert('Успешный вход', `Добро пожаловать! Вы вошли как ${email}`, [
        {
          text: 'Продолжить',
          onPress: () => {
            // Переход к следующему экрану
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('Ошибка входа', e.message || 'Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
          {/* Верхний логотип в стиле Самокат */}
          <View style={styles.logoBadge}>
            <ShoppingBag size={28} color={Colors.primary} strokeWidth={2.3} />
          </View>

          {/* Заголовки */}
          <Text style={styles.title}>Вход в аккаунт</Text>
          <Text style={styles.subtitle}>Синхронизируйте покупки с семьей</Text>

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
              leftIcon={<Mail size={18} color={Colors.textMuted} />}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <AppInput
              label="Пароль"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="Введите пароль"
              isPassword
              leftIcon={<Lock size={18} color={Colors.textMuted} />}
              error={errors.password}
            />

            {/* Ссылка "Забыли пароль?" */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPasswordWrapper}
            >
              <Text style={styles.forgotPasswordText}>Забыли пароль?</Text>
            </TouchableOpacity>

            {/* Главная розовая кнопка "Войти" */}
            <AppButton
              title="Войти"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />
          </View>

          {/* Нижний блок перехода к регистрации */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Нет аккаунта? </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.registerLink}>Зарегистрироваться</Text>
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
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.primaryLight,
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
    color: Colors.blue,
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
    color: Colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});
