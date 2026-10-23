import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Share,
  Alert,
} from 'react-native';
import { AppText as Text } from './AppText';
import { X, Copy, Check, Share2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '../context/AppContext';

interface AddFamilyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddFamilyModal: React.FC<AddFamilyModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, t, family } = useApp();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (family?.code) {
      await Clipboard.setStringAsync(family.code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const familyName = family?.name || 'Моя группа';
  const familyCode = family?.code || '—';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Присоединяйся к совместной корзине «${familyName}» в ProductBasket! Код приглашения: ${familyCode}`,
      });
    } catch {
      Alert.alert('Код приглашения', `Код: ${familyCode}`);
    }
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
                  {t('modalAddFamilyTitle')}
                </Text>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: colors.cardSecondary }]}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('modalAddFamilySubtitle', { familyName })}
              </Text>

              {/* Карточка кода */}
              <View
                style={[
                  styles.codeCard,
                  { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.codeLabel, { color: colors.textMuted }]}>
                  {t('inviteCodeHeader')}
                </Text>
                <View style={styles.codeRow}>
                  <Text style={[styles.codeText, { color: colors.textDark }]}>
                    {familyCode}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.copyPill,
                      {
                        backgroundColor: copied ? colors.successLight : colors.blueLight,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={handleCopy}
                  >
                    {copied ? (
                      <>
                        <Check size={14} color={colors.success} style={{ marginRight: 4 }} />
                        <Text style={[styles.copyText, { color: colors.success }]}>
                          {t('copiedBtn')}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Copy size={14} color={colors.blue} style={{ marginRight: 4 }} />
                        <Text style={[styles.copyText, { color: colors.blue }]}>
                          {t('copyCodeBtn')}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {t('inviteCodeHint')}
              </Text>

              {/* Кнопка Поделиться кодом */}
              <View style={styles.buttonWrapper}>
                <TouchableOpacity
                  style={[styles.shareBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                  onPress={handleShare}
                >
                  <Share2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.shareBtnText}>{t('shareCodeBtn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
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
    marginBottom: 4,
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
  subtitle: {
    fontSize: 13,
    marginBottom: 18,
  },
  codeCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1,
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 20,
  },
  buttonWrapper: {
    width: '100%',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
