import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { AppText as Text } from './AppText';
import { X, Users, Copy, Check, Share2, ShoppingBag } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useApp, type FamilyState } from '../context/AppContext';

interface FamilyMembersModalProps {
  visible: boolean;
  onClose: () => void;
  targetFamily?: FamilyState | null;
}

export const FamilyMembersModal: React.FC<FamilyMembersModalProps> = ({
  visible,
  onClose,
  targetFamily,
}) => {
  const { colors, family: activeFamily, currentUser, cartItems, getFamilyCart } = useApp();
  const [copied, setCopied] = useState(false);

  const family = targetFamily || activeFamily;

  if (!family) return null;

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(family.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Присоединяйся к группе «${family.name}» в приложении ProductBasket! Код приглашения: ${family.code}`,
      });
    } catch {
      Alert.alert('Код приглашения', `Код: ${family.code}`);
    }
  };

  // Подсчет товаров в корзине на каждого участника (считаем из корзины конкретно этой семьи)
  const familyCart = family && getFamilyCart ? getFamilyCart(family.id) : cartItems;
  const itemsList = Object.values(familyCart || {});
  const getMemberAssignedCount = (memberId: string) => {
    return itemsList.filter((item) => item.assignedToUserId === memberId).length;
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
                <View style={styles.headerTitleBox}>
                  <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                    <Users size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.headerTitle, { color: colors.textDark }]} numberOfLines={1}>
                      {family.name}
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                      Список участников ({family.members.length})
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

              {/* Карточка кода приглашения */}
              <View
                style={[
                  styles.codeBanner,
                  { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                ]}
              >
                <View style={styles.codeBannerLeft}>
                  <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>
                    Код приглашения в группу
                  </Text>
                  <Text style={[styles.codeValue, { color: colors.textDark }]}>
                    {family.code}
                  </Text>
                </View>

                <View style={styles.codeActions}>
                  <TouchableOpacity
                    style={[
                      styles.codeBtn,
                      { backgroundColor: copied ? colors.successLight : colors.blueLight },
                    ]}
                    activeOpacity={0.7}
                    onPress={handleCopyCode}
                  >
                    {copied ? (
                      <Check size={14} color={colors.success} strokeWidth={2.8} />
                    ) : (
                      <Copy size={14} color={colors.blue} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.codeBtn, { backgroundColor: colors.primaryLight }]}
                    activeOpacity={0.7}
                    onPress={handleShareCode}
                  >
                    <Share2 size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Список участников */}
              <ScrollView
                style={styles.membersScroll}
                contentContainerStyle={styles.membersList}
                showsVerticalScrollIndicator={false}
              >
                {family.members.map((member) => {
                  const isMe = member.id === currentUser.id;
                  const assignedCount = getMemberAssignedCount(member.id);

                  return (
                    <View
                      key={member.id}
                      style={[
                        styles.memberCard,
                        {
                          backgroundColor: colors.cardSecondary,
                          borderColor: isMe ? colors.primary : colors.border,
                          borderWidth: isMe ? 1.5 : 1,
                        },
                      ]}
                    >
                      <View style={styles.memberLeft}>
                        <View
                          style={[
                            styles.avatarCircle,
                            { backgroundColor: member.avatarBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.avatarText,
                              { color: member.avatarColor },
                            ]}
                          >
                            {member.avatarChar}
                          </Text>
                        </View>

                        <View style={styles.memberInfo}>
                          <View style={styles.nameRow}>
                            <Text
                              style={[styles.memberName, { color: colors.textDark }]}
                              numberOfLines={1}
                            >
                              {member.name}
                            </Text>
                            {isMe && (
                              <View
                                style={[
                                  styles.meBadge,
                                  { backgroundColor: colors.lime },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.meBadgeText,
                                    { color: colors.limeDark },
                                  ]}
                                >
                                  Вы
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text
                            style={[styles.memberEmail, { color: colors.textSecondary }]}
                            numberOfLines={1}
                          >
                            {member.email}
                          </Text>
                        </View>
                      </View>

                      {/* Индикатор товаров в корзине */}
                      <View
                        style={[
                          styles.basketBadge,
                          {
                            backgroundColor:
                              assignedCount > 0 ? colors.primaryLight : colors.cardSecondary,
                          },
                        ]}
                      >
                        <ShoppingBag
                          size={12}
                          color={assignedCount > 0 ? colors.primary : colors.textMuted}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.basketBadgeText,
                            {
                              color:
                                assignedCount > 0 ? colors.primary : colors.textSecondary,
                            },
                          ]}
                        >
                          {assignedCount} {assignedCount === 1 ? 'товар' : 'товаров'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
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
    maxHeight: '85%',
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
    marginRight: 12,
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
  codeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  codeBannerLeft: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  codeValue: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  codeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  membersScroll: {
    maxHeight: 340,
  },
  membersList: {
    gap: 10,
    paddingBottom: 10,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
  },
  meBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  meBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  memberEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  basketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  basketBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
