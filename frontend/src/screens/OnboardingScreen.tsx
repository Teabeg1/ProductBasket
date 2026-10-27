import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { AppText as Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, Key, LogOut, Clipboard as ClipboardIcon, ArrowLeft } from 'lucide-react-native';
import * as ClipboardExpo from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { AppButton } from '../components/AppButton';
import type { AuthNavigationProp } from '../navigation/types';

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const { colors, t, createFamily, joinFamilyWithCode, family, currentUser, logout } = useApp();

  // Режим экрана: 'create' (Создать семью) или 'join' (Вступить по коду)
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  const [familyNameInput, setFamilyNameInput] = useState('');
  const [pinDigits, setPinDigits] = useState(''); // 6-значный случайный код (буквы и цифры)
  const [isPinFocused, setIsPinFocused] = useState(false);

  const pinInputRef = useRef<any>(null);

  const showAlert = (title: string, message?: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(title + (message ? `\n\n${message}` : ''));
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, onOk ? [{ text: 'Продолжить', onPress: onOk }] : undefined);
    }
  };

  const handleCreateFamily = async () => {
    const trimmed = familyNameInput.trim();
    if (!trimmed) {
      showAlert('Ошибка', 'Введите название группы');
      return;
    }
    let newCode = '';
    try {
      newCode = await createFamily(trimmed);
    } catch (e: any) {
      showAlert('Ошибка создания группы', e.message || 'Не удалось создать группу');
      return;
    }

    showAlert(
      'Группа успешно создана!',
      `Вы создали группу «${trimmed}».\n\nКод приглашения: ${newCode}\n\nПоделитесь этим кодом с близкими, чтобы они могли присоединиться!`,
      () => navigation.navigate('Main')
    );
  };

  const executeJoinFamily = async (codeToJoin: string) => {
    Keyboard.dismiss();
    const cleanCode = codeToJoin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanCode.length === 0) {
      showAlert('Введите код', 'Пожалуйста, введите 6-значный код приглашения.');
      return;
    }

    let success = false;
    try {
      success = await joinFamilyWithCode(cleanCode);
    } catch (e: any) {
      showAlert('Ошибка вступления', e.message || 'Не удалось присоединиться к группе');
      return;
    }

    if (success) {
      showAlert(
        t('joinSuccessTitle') || 'Успешно!',
        `${t('joinSuccessText') || 'Вы успешно присоединились к группе'}!`,
        () => navigation.navigate('Main')
      );
    } else {
      showAlert(
        'Код не найден',
        `Группа с кодом «${cleanCode}» не найдена.\n\nУбедитесь, что группа уже создана или проверьте введённый код.`
      );
    }
  };

  const handleJoinFamily = () => {
    executeJoinFamily(pinDigits);
  };

  const handleLogout = () => {
    logout();
    navigation.navigate('Login');
  };

  const handlePinTextChange = (text: string) => {
    // Принимаем латинские буквы и цифры в верхнем регистре, максимум 6 символов
    const sanitized = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setPinDigits(sanitized);

    // Автоматическая отправка при вводе 6-го символа
    if (sanitized.length === 6) {
      setTimeout(() => {
        executeJoinFamily(sanitized);
      }, 100);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await ClipboardExpo.getStringAsync();
      if (!text) {
        showAlert('Буфер пуст', 'В буфере обмена нет скопированного текста.');
        return;
      }
      const sanitized = text.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (sanitized.length === 0) {
        showAlert('Некорректный код', 'В буфере обмена не найден код приглашения.');
        return;
      }
      setPinDigits(sanitized);
      if (sanitized.length === 6) {
        setTimeout(() => {
          executeJoinFamily(sanitized);
        }, 100);
      }
    } catch {
      showAlert('Ошибка', 'Не удалось прочитать буфер обмена.');
    }
  };

  const cells = [
    pinDigits[0] || '',
    pinDigits[1] || '',
    pinDigits[2] || '',
    pinDigits[3] || '',
    pinDigits[4] || '',
    pinDigits[5] || '',
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Верхняя строка с именем аккаунта и кнопкой выхода */}
          <View style={styles.topHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              {(navigation.canGoBack() || currentUser?.id || family != null) && (
                <TouchableOpacity
                  style={[styles.backBtnPill, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (navigation.canGoBack()) {
                      navigation.goBack();
                    } else {
                      navigation.navigate('Main');
                    }
                  }}
                >
                  <ArrowLeft size={14} color={colors.textDark} style={{ marginRight: 5 }} />
                  <Text style={[styles.backBtnPillText, { color: colors.textDark }]}>Назад</Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.title, { color: colors.textDark }]}>
                {t('onboardingTitle')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Вы вошли как <Text style={{ fontWeight: '700', color: colors.textDark }}>{currentUser.name}</Text> ({currentUser.email})
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.logoutPill, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={handleLogout}
            >
              <LogOut size={14} color={colors.error} style={{ marginRight: 4 }} />
              <Text style={[styles.logoutPillText, { color: colors.error }]}>Выйти</Text>
            </TouchableOpacity>
          </View>

          {/* Переключатель режимов: Создать семью / Вступить по коду */}
          <View style={[styles.tabSwitcher, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'create' && [styles.tabBtnActive, { backgroundColor: colors.card }],
              ]}
              activeOpacity={0.8}
              onPress={() => {
                Keyboard.dismiss();
                setActiveTab('create');
              }}
            >
              <Home size={15} color={activeTab === 'create' ? colors.primary : colors.textSecondary} style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'create' ? colors.textDark : colors.textSecondary },
                  activeTab === 'create' && styles.tabBtnTextActive,
                ]}
              >
                Создать группу
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'join' && [styles.tabBtnActive, { backgroundColor: colors.card }],
              ]}
              activeOpacity={0.8}
              onPress={() => {
                setActiveTab('join');
                setTimeout(() => pinInputRef.current?.focus(), 150);
              }}
            >
              <Key size={15} color={activeTab === 'join' ? colors.blue : colors.textSecondary} style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'join' ? colors.textDark : colors.textSecondary },
                  activeTab === 'join' && styles.tabBtnTextActive,
                ]}
              >
                Вступить по коду
              </Text>
            </TouchableOpacity>
          </View>

          {/* РЕЖИМ 1: СОЗДАТЬ НОВУЮ СЕМЬЮ */}
          {activeTab === 'create' && (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.homeBadge, { backgroundColor: colors.successLight }]}>
                  <Home size={18} color={colors.success} />
                </View>
              </View>

              <View style={styles.cardMeta}>
                <Text style={[styles.cardTitle, { color: colors.textDark }]}>
                  {t('createFamilyCardTitle')}
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  {t('createFamilyCardSubtitle')}
                </Text>
              </View>

              <View
                style={[
                  styles.nameInputBox,
                  { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                ]}
              >
                <TextInput
                  style={[styles.nameInput, { color: colors.textDark }]}
                  value={familyNameInput}
                  onChangeText={setFamilyNameInput}
                  placeholder={t('familyNamePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <AppButton
                title={t('createFamilySubmitBtn')}
                onPress={handleCreateFamily}
              />

              <TouchableOpacity
                style={styles.switchModeLink}
                activeOpacity={0.7}
                onPress={() => {
                  setActiveTab('join');
                  setTimeout(() => pinInputRef.current?.focus(), 150);
                }}
              >
                <Text style={[styles.switchModeLinkText, { color: colors.blue }]}>
                  Уже есть код приглашения? Вступить в группу ➔
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* РЕЖИМ 2: ВСТУПИТЬ ПО КОДУ (ВСЕГДА НАВЕРХУ, КЛАВИАТУРА НЕ ПЕРЕКРЫВАЕТ!) */}
          {activeTab === 'join' && (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.keyBadge, { backgroundColor: colors.blueLight }]}>
                  <Key size={18} color={colors.blue} />
                </View>
              </View>

              <View style={styles.cardMeta}>
                <Text style={[styles.cardTitle, { color: colors.textDark }]}>
                  {t('joinFamilyCardTitle')}
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  Введите 6-значный код приглашения (буквы и цифры)
                </Text>
              </View>

              {/* Блок ввода 6-значного случайного кода */}
              <TouchableWithoutFeedback onPress={() => pinInputRef.current?.focus()}>
                <View style={styles.pinWrapper}>
                  <View style={styles.codeRowContainer}>
                    {cells.map((char, i) => {
                      const isCurrent = isPinFocused && i === pinDigits.length;
                      return (
                        <View
                          key={`char-${i}`}
                          style={[
                            styles.digitCell,
                            {
                              backgroundColor: colors.cardSecondary,
                              borderColor: isCurrent
                                ? colors.primary
                                : char
                                ? colors.textDark
                                : colors.border,
                              borderWidth: isCurrent ? 2 : 1.2,
                            },
                          ]}
                        >
                          <Text style={[styles.digitText, { color: colors.textDark }]}>
                            {char}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Невидимый общий TextInput для набора кода */}
                  <TextInput
                    ref={pinInputRef}
                    value={pinDigits}
                    onChangeText={handlePinTextChange}
                    onFocus={() => setIsPinFocused(true)}
                    onBlur={() => setIsPinFocused(false)}
                    style={styles.hiddenInput}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={6}
                    autoFocus
                  />
                </View>
              </TouchableWithoutFeedback>

              {/* Кнопка «Вставить из буфера обмена» */}
              <TouchableOpacity
                style={[
                  styles.pasteBtn,
                  { backgroundColor: colors.blueLight, borderColor: colors.blue },
                ]}
                activeOpacity={0.7}
                onPress={handlePasteFromClipboard}
              >
                <ClipboardIcon size={15} color={colors.blue} style={{ marginRight: 6 }} />
                <Text style={[styles.pasteBtnText, { color: colors.blue }]}>
                  Вставить из буфера обмена
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.joinSubmitBtn,
                  {
                    backgroundColor:
                      pinDigits.length === 6 ? colors.primary : colors.cardSecondary,
                  },
                ]}
                activeOpacity={0.8}
                onPress={handleJoinFamily}
              >
                <Text
                  style={[
                    styles.joinSubmitBtnText,
                    {
                      color:
                        pinDigits.length === 6 ? '#FFFFFF' : colors.textSecondary,
                    },
                  ]}
                >
                  {t('joinFamilySubmitBtn')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchModeLink}
                activeOpacity={0.7}
                onPress={() => setActiveTab('create')}
              >
                <Text style={[styles.switchModeLinkText, { color: colors.textSecondary }]}>
                  Хотите создать новую группу? Создать группу ➔
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 60,
  },
  backBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  backBtnPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  logoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    fontWeight: '700',
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  homeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardMeta: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  nameInputBox: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
    marginBottom: 16,
  },
  nameInput: {
    fontSize: 15,
    fontWeight: '600',
  },
  pinWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  codeRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  digitCell: {
    width: 42,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitText: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    fontSize: 1,
    color: 'transparent',
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignSelf: 'center',
  },
  pasteBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  joinSubmitBtn: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinSubmitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  switchModeLink: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  switchModeLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
