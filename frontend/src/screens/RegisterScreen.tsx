import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { AppText as Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, Lock, Check, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { Colors, Typography, Radii } from '../constants/theme';
import { AuthService } from '../services/api';
import { useApp } from '../context/AppContext';
import type { AuthNavigationProp } from '../navigation/types';
export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const { colors, setCurrentUserFromAuth } = useApp();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  const getPasswordStrength = (pass: string): {
    score: number;
    label: string;
    color: string;
  } => {
    if (!pass) return { score: 0, label: '', color: colors.border };
    const hasLetters = /[a-zA-Zа-яА-ЯёЁ]/.test(pass);
    const hasDigits = /[0-9]/.test(pass);
    const hasSpecial = /[^a-zA-Zа-яА-ЯёЁ0-9]/.test(pass);
    const hasMixedCase = /[a-zа-яё]/.test(pass) && /[A-ZА-ЯЁ]/.test(pass);

    if (pass.length < 6) {
      return { score: 1, label: 'Слабый', color: '#EF4444' };
    }
    if (pass.length >= 8 && (hasSpecial || hasMixedCase) && hasDigits && hasLetters) {
      return { score: 3, label: 'Надежный', color: '#10B981' };
    }
    return { score: 2, label: 'Нормальный', color: '#F59E0B' };
  };

  const passwordStrength = getPasswordStrength(password);

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!displayName.trim()) {
      newErrors.displayName = 'Укажите ваше имя';
    }

    if (!email.trim()) {
      newErrors.email = 'Укажите email или телефон';
    } else if (!email.includes('@') && email.length < 10) {
      newErrors.email = 'Некорректный email или телефон';
    }

    if (!password) {
      newErrors.password = 'Придумайте пароль';
    } else if (password.length < 6) {
      newErrors.password = 'Пароль должен содержать минимум 6 символов';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    if (!agreedToTerms) {
      newErrors.terms = 'Необходимо принять условия использования';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const authData = await AuthService.register({ displayName, email, password });

      // Регистрируем пользователя в глобальном контексте приложения с реальным ID из БД
      await setCurrentUserFromAuth(authData);

      const successTitle = 'Аккаунт создан!';
      const successMessage = `Поздравляем, ${displayName}! Теперь создайте семейную группу или присоединитесь по коду.`;

      if (Platform.OS === 'web') {
        window.alert(`${successTitle}\n\n${successMessage}`);
        navigation.navigate('Onboarding');
      } else {
        Alert.alert(
          successTitle,
          successMessage,
          [
            {
              text: 'Продолжить',
              onPress: () => {
                navigation.navigate('Onboarding');
              },
            },
          ]
        );
      }
    } catch (e: any) {
      const errorMsg = e.message || 'Не удалось зарегистрироваться';
      if (Platform.OS === 'web') {
        window.alert(`Ошибка регистрации: ${errorMsg}`);
      } else {
        Alert.alert('Ошибка регистрации', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
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

          {/* Заголовки */}
          <Text style={styles.title}>Создать аккаунт</Text>
          <Text style={styles.subtitle}>Быстрый старт для всей группы</Text>

          {/* Форма регистрации */}
          <View style={styles.form}>
            <AppInput
              label="Ваше имя"
              value={displayName}
              onChangeText={(text) => {
                setDisplayName(text);
                if (errors.displayName) setErrors((p) => ({ ...p, displayName: undefined }));
              }}
              placeholder="Например, Иван"
              leftIcon={<User size={18} color={Colors.textMuted} />}
              error={errors.displayName}
            />

            <AppInput
              label="Email или телефон"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
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
                if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
              }}
              placeholder="Не менее 6 символов"
              isPassword
              leftIcon={<Lock size={18} color={Colors.textMuted} />}
              error={errors.password}
            />

            {/* Индикатор сложности пароля: цветовая полоска (слабый / нормальный / надежный) */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBarsRow}>
                  {[1, 2, 3].map((barIndex) => (
                    <View
                      key={barIndex}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            barIndex <= passwordStrength.score
                              ? passwordStrength.color
                              : colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                  {passwordStrength.label}
                </Text>
              </View>
            )}

            <AppInput
              label="Повторите пароль"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: undefined }));
              }}
              placeholder="Повторите пароль"
              isPassword
              leftIcon={<Lock size={18} color={Colors.textMuted} />}
              error={errors.confirmPassword}
            />

            {/* Чекбокс согласия с условиями */}
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.checkbox,
                  agreedToTerms && styles.checkboxActive,
                  errors.terms ? styles.checkboxError : null,
                ]}
                onPress={() => {
                  setAgreedToTerms(!agreedToTerms);
                  if (errors.terms) setErrors((p) => ({ ...p, terms: undefined }));
                }}
              >
                {agreedToTerms && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
              </TouchableOpacity>
              <Text style={styles.termsText}>
                Я принимаю{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => setShowTermsModal(true)}
                >
                  условия сервиса
                </Text>{' '}
                и согласен на обработку персональных данных
              </Text>
            </View>
            {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

            {/* Кнопка регистрации */}
            <AppButton
              title="Зарегистрироваться"
              onPress={handleRegister}
              loading={loading}
              style={styles.submitButton}
            />
          </View>

          {/* Нижняя ссылка возврата на вход */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Уже есть аккаунт? </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginLink, { color: colors.primary }]}>Войти</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Модальное окно: Пользовательское соглашение */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Верхний хэндл шторки */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Условия сервиса</Text>
              <TouchableOpacity
                onPress={() => setShowTermsModal(false)}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <X size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.legalHeading}>1. Назначение сервиса</Text>
              <Text style={styles.legalParagraph}>
                «Совместная корзина продуктов» — мобильный сервис для совместного планирования покупок и распределения обязанностей по приобретению товаров.
              </Text>

              <Text style={styles.legalHeading}>2. Группа пользователей</Text>
              <Text style={styles.legalParagraph}>
                Пользователи объединяются в группы по коду приглашения. Все участники группы равны и могут добавлять или исключать участников.
              </Text>

              <Text style={styles.legalHeading}>3. Синхронизация в реальном времени</Text>
              <Text style={styles.legalParagraph}>
                При нажатии «Куплю я» товар мгновенно резервируется за вами и обновляется у всех участников группы в режиме реального времени.
              </Text>

              <Text style={styles.legalHeading}>4. Персональные данные</Text>
              <Text style={styles.legalParagraph}>
                Имя и контактные данные используются строго внутри вашей группы для отображения ответственного за покупку и не передаются третьим лицам.
              </Text>
            </ScrollView>

            <AppButton
              title="Принять и закрыть"
              onPress={() => {
                setAgreedToTerms(true);
                if (errors.terms) setErrors((p) => ({ ...p, terms: undefined }));
                setShowTermsModal(false);
              }}
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>
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
    paddingTop: 16,
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
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    ...Typography.titleLarge,
    marginBottom: 6,
  },
  subtitle: {
    ...Typography.body,
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -8,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  strengthBarsRow: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
    gap: 6,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxError: {
    borderColor: Colors.error,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.blue,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginBottom: 12,
    marginLeft: 2,
  },
  submitButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    paddingVertical: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 18, 24, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radii.modal,
    borderTopRightRadius: Radii.modal,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...Typography.titleMedium,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    marginBottom: 16,
  },
  legalHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    marginTop: 10,
    marginBottom: 4,
  },
  legalParagraph: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 8,
  },
  modalButton: {
    marginTop: 8,
  },
});
