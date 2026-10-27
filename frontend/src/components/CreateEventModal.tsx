import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppText as Text } from './AppText';
import { X, Calendar as CalendarIcon, Users } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { AppButton } from './AppButton';

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
}

const EMOJI_OPTIONS = ['🎄', '🎂', '🎃', '🥂', '🍕', '🎈'];

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, t, createEvent, families, activeFamilyId } = useApp();

  const getFormattedToday = () => {
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    const now = new Date();
    return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  const [selectedFamilyId, setSelectedFamilyId] = useState<string>(
    activeFamilyId || (families[0]?.id ?? '')
  );

  useEffect(() => {
    if (visible) {
      setSelectedFamilyId(activeFamilyId || (families[0]?.id ?? ''));
    }
  }, [visible, activeFamilyId, families]);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getFormattedToday());
  const [selectedEmoji, setSelectedEmoji] = useState('🎄');

  const handleCreate = () => {
    const today = getFormattedToday();
    createEvent({
      title: title.trim() || 'Новое мероприятие',
      date: date.trim() || today,
      emoji: selectedEmoji,
      familyId: selectedFamilyId || activeFamilyId || undefined,
      hasCart: true,
    });
    setTitle('');
    setDate(today);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.sheetContainer,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
              {/* Handle */}
              <View style={styles.handleWrap}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>

              {/* Header */}
              <View style={styles.headerRow}>
                <Text style={[styles.headerTitle, { color: colors.textDark }]}>
                  {t('modalCreateEventTitle')}
                </Text>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: colors.cardSecondary }]}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Выбор группы для мероприятия (Requirement 1: чуть выше названия мероприятия) */}
              {families.length > 0 && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    Группа мероприятия *
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.familySelectRow}
                  >
                    {families.map((fam) => {
                      const isSelected = fam.id === selectedFamilyId;
                      return (
                        <TouchableOpacity
                          key={fam.id}
                          style={[
                            styles.familySelectPill,
                            {
                              backgroundColor: isSelected ? colors.primaryLight : colors.cardSecondary,
                              borderColor: isSelected ? colors.primary : colors.border,
                              borderWidth: isSelected ? 2 : 1,
                            },
                          ]}
                          activeOpacity={0.7}
                          onPress={() => setSelectedFamilyId(fam.id)}
                        >
                          <Users
                            size={14}
                            color={isSelected ? colors.primary : colors.textSecondary}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={[
                              styles.familySelectPillText,
                              { color: isSelected ? colors.primary : colors.textDark },
                              isSelected && styles.familySelectPillTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {fam.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Поле 1: Название мероприятия */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {t('eventNameLabel')}
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.textDark }]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder={t('eventNamePlaceholder')}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* Поле 2: Дата проведения */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {t('eventDateLabel')}
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.inputLeft}>
                    <CalendarIcon size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.input, { color: colors.textDark }]}
                      value={date}
                      onChangeText={setDate}
                      placeholder="Выберите дату"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              </View>

              {/* Поле 3: Иконка / эмодзи */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {t('eventIconLabel')}
                </Text>
                <View style={styles.emojiRow}>
                  {EMOJI_OPTIONS.map((emoji) => {
                    const isSelected = emoji === selectedEmoji;
                    return (
                      <TouchableOpacity
                        key={emoji}
                        activeOpacity={0.7}
                        onPress={() => setSelectedEmoji(emoji)}
                        style={[
                          styles.emojiCell,
                          {
                            backgroundColor: isSelected ? colors.primaryLight : colors.cardSecondary,
                            borderColor: isSelected ? colors.primary : colors.border,
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Кнопка Создать */}
              <View style={styles.buttonWrapper}>
                <AppButton
                  title={t('createEventSubmitBtn')}
                  onPress={handleCreate}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 23, 31, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputBox: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  inputLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  emojiCell: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 22,
  },
  buttonWrapper: {
    marginTop: 12,
  },
  familySelectRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  familySelectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  familySelectPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  familySelectPillTextActive: {
    fontWeight: '700',
  },
});
