import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppText as Text } from './AppText';
import { X, PackagePlus, ShoppingBag } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { AppButton } from './AppButton';

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
}

const EMOJI_OPTIONS = [
  '🥟', '🍕', '🥪', '🍞', '🥩', '🥓',
  '🍳', '🍫', '🍰', '☕', '🥤', '🧃',
  '🍇', '🥕', '🧼', '🧻', '🧴', '📦',
  '🍜', '🥫', '🧀', '🧄', '🧅', '🍌',
];

export const AddProductModal: React.FC<AddProductModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, family, addCustomProduct } = useApp();

  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🥟');

  const handleAdd = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Ошибка', 'Введите название товара');
      return;
    }

    if (!family) {
      Alert.alert('Ошибка', 'Сначала вступите или создайте группу');
      return;
    }

    addCustomProduct(family.id, {
      title: trimmedTitle,
      unit: unit.trim() || '1 шт • Штучный',
      emoji: selectedEmoji,
    });

    Alert.alert(
      'Товар добавлен!',
      `Товар «${trimmedTitle}» добавлен в каталог группы «${family.name}». Теперь его можно добавлять в корзину.`,
      [{ text: 'Отлично', onPress: onClose }]
    );

    setTitle('');
    setUnit('');
    setSelectedEmoji('🥟');
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
                <View style={styles.headerTitleBox}>
                  <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                    <PackagePlus size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.headerTitle, { color: colors.textDark }]} numberOfLines={1}>
                      Добавить свой товар
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                      Для группы «{family?.name || 'Моя группа'}»
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: colors.cardSecondary }]}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Поле 1: Название товара */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Название товара *
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
                    placeholder="Например, Пельмени по-домашнему"
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                  />
                </View>
              </View>

              {/* Поле 2: Фасовка / Объем */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Фасовка или вес
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.textDark }]}
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="Например, 800 г • Заморозка"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* Поле 3: Выбор иконки (эмодзи) */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Иконка товара
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.emojiRow}
                >
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
                </ScrollView>
              </View>

              {/* Превью добавления */}
              <View
                style={[
                  styles.previewCard,
                  { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                ]}
              >
                <View style={[styles.previewEmojiBox, { backgroundColor: colors.card }]}>
                  <Text style={{ fontSize: 26 }}>{selectedEmoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.previewTitle, { color: colors.textDark }]}
                    numberOfLines={1}
                  >
                    {title.trim() || 'Название товара'}
                  </Text>
                  <Text
                    style={[styles.previewUnit, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {unit.trim() || '1 шт • Штучный'}
                  </Text>
                </View>
                <View style={[styles.previewBadge, { backgroundColor: colors.lime }]}>
                  <Text style={[styles.previewBadgeText, { color: colors.limeDark }]}>
                    Свой товар
                  </Text>
                </View>
              </View>

              {/* Кнопка Сохранить */}
              <View style={styles.buttonWrapper}>
                <AppButton
                  title="Добавить в каталог группы"
                  onPress={handleAdd}
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
    marginBottom: 16,
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputBox: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14,
    fontWeight: '500',
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  emojiCell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 22,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 16,
  },
  previewEmojiBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  previewUnit: {
    fontSize: 11,
    marginTop: 2,
  },
  previewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  buttonWrapper: {
    marginTop: 4,
  },
});
