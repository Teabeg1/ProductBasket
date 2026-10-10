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
import { ArrowLeft, Mail, Lock, CheckCircle2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { Colors, Typography, Radii } from '../constants/theme';
import type { AuthNavigationProp } from '../navigation/types';

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Введите email или телефон');
      return;
    }
    if (!email.includes('@') && email.length < 10) {
      setError('Некорректный формат email или телефона');
      return;
    }

    setError(undefined);
    setLoading(true);

    try {
      // Имитация вызова API восстановления пароля
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSentSuccess(true);
    } catch (e: any) {
      Alert.alert('Ошибка', 'Не удалось отправить инструкцию. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Верхняя навигация назад */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={Colors.textDark} strokeWidth={2.2} />
          </TouchableOpacity>

          {/* Иконка замка в бейдже */}
          <View style={styles.logoBadge}>
            <Lock size={26} color={Colors.primary} strokeWidth={2.3} />
          </View>

          {/* Заголовки */}
          <Text style={styles.title}>Восстановление пароля</Text>
          <Text style={styles.subtitle}>
            Введите email, указанный при регистрации. Мы отправим ссылку и код для сброса пароля.
          </Text>

          {sentSuccess ? (
            /* Успешное состояние после отправки */
            <View style={styles.successCard}>
              <View style={styles.successIconWrapper}>
                <CheckCircle2 size={32} color={Colors.success} strokeWidth={2.2} />
              </View>
              <Text style={styles.successTitle}>Письмо отправлено!</Text>
              <Text style={styles.successText}>
                Мы отправили ссылку для восстановления на адрес{'\n'}
                <Text style={styles.successEmail}>{email || 'ivan@mail.ru'}</Text>.{'\n'}
                Проверьте папку «Входящие» и «Спам».
              </Text>
              <AppButton
                title="Вернуться ко входу"
                onPress={() => navigation.navigate('Login')}
                style={styles.backToLoginBtn}
              />
            </View>
          ) : (
            /* Форма ввода email */
            <View style={styles.form}>
              <AppInput
                label="Email или телефон"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(undefined);
                }}
                placeholder="ivan@mail.ru"
                leftIcon={<Mail size={18} color={Colors.textMuted} />}
                keyboardType="email-address"
                autoCapitalize="none"
                error={error}
              />

              <AppButton
                title="Отправить ссылку"
                onPress={handleResetPassword}
                loading={loading}
                style={styles.submitButton}
              />
            </View>
          )}

          {/* Нижняя ссылка возврата на вход */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Вспомнили пароль? </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Войти</Text>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoBadge: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    ...Typography.titleLarge,
    marginBottom: 6,
  },
  subtitle: {
    ...Typography.body,
    marginBottom: 20,
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  submitButton: {
    marginTop: 6,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.card,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  successIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 6,
  },
  successText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  successEmail: {
    fontWeight: '700',
    color: Colors.textDark,
  },
  backToLoginBtn: {
    width: '100%',
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
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});
