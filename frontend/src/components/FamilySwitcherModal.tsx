import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { AppText as Text } from './AppText';
import { X, Check, Plus, Key, Users } from 'lucide-react-native';
import { useApp, type FamilyState } from '../context/AppContext';

interface FamilySwitcherModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenCreateFamily: () => void;
  onOpenJoinFamily: () => void;
  onOpenViewMembers?: (targetFamily?: FamilyState) => void;
}

export const FamilySwitcherModal: React.FC<FamilySwitcherModalProps> = ({
  visible,
  onClose,
  onOpenCreateFamily,
  onOpenJoinFamily,
  onOpenViewMembers,
}) => {
  const { colors, families, activeFamilyId, switchFamily } = useApp();

  const getMembersWord = (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) return 'участник';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'участника';
    return 'участников';
  };

  const handleSelect = (id: string) => {
    switchFamily(id);
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
                <View style={{ flex: 1 }}>
                  <Text style={[styles.headerTitle, { color: colors.textDark }]}>
                    Мои группы
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                    Переключение между группами покупок
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: colors.cardSecondary }]}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Список групп */}
              <ScrollView
                style={styles.familiesScroll}
                contentContainerStyle={styles.familiesList}
                showsVerticalScrollIndicator={false}
              >
                {families.map((fam) => {
                  const isActive = fam.id.toLowerCase() === activeFamilyId?.toLowerCase();

                  return (
                    <TouchableOpacity
                      key={fam.id}
                      style={[
                        styles.familyCard,
                        {
                          backgroundColor: isActive ? colors.card : colors.cardSecondary,
                          borderColor: isActive ? colors.primary : colors.border,
                          borderWidth: isActive ? 2 : 1,
                        },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => handleSelect(fam.id)}
                    >
                      <View style={styles.cardLeft}>
                        {/* Иконка группы */}
                        <View
                          style={[
                            styles.famIconBox,
                            {
                              backgroundColor: isActive ? colors.primaryLight : colors.cardSecondary,
                            },
                          ]}
                        >
                          <Users
                            size={18}
                            color={isActive ? colors.primary : colors.textSecondary}
                          />
                        </View>

                        {/* Название и участники */}
                        <View style={styles.cardInfo}>
                          <Text
                            style={[
                              styles.famTitle,
                              { color: colors.textDark, fontWeight: isActive ? '800' : '600' },
                            ]}
                            numberOfLines={1}
                          >
                            {fam.name}
                          </Text>
                          <View style={styles.membersRow}>
                            {/* Мини аватары */}
                            <View style={styles.avatarGroup}>
                              {fam.members.slice(0, 3).map((m, idx) => (
                                <View
                                  key={m.id}
                                  style={[
                                    styles.miniAvatar,
                                    idx > 0 && styles.avatarOverlap,
                                    { backgroundColor: m.avatarBg, borderColor: colors.card },
                                  ]}
                                >
                                  <Text style={[styles.miniAvatarText, { color: m.avatarColor }]}>
                                    {m.avatarChar}
                                  </Text>
                                </View>
                              ))}
                            </View>
                            <Text style={[styles.famMembersText, { color: colors.textSecondary }]}>
                              {fam.members.length} {getMembersWord(fam.members.length)} • {fam.code}
                            </Text>
                            {onOpenViewMembers && (
                              <TouchableOpacity
                                style={[styles.inspectMembersBtn, { backgroundColor: colors.primaryLight }]}
                                activeOpacity={0.7}
                                onPress={() => {
                                  onClose();
                                  onOpenViewMembers(fam);
                                }}
                              >
                                <Text style={[styles.inspectMembersBtnText, { color: colors.primary }]}>
                                  Участники ➔
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Индикатор выбора */}
                      {isActive ? (
                        <View
                          style={[
                            styles.activeCheckPill,
                            { backgroundColor: colors.primary },
                          ]}
                        >
                          <Check size={14} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.radioCircle,
                            { borderColor: colors.border },
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Кнопки действий */}
              <View style={styles.actionBtnsRow}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    onOpenCreateFamily();
                  }}
                >
                  <Plus size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: colors.textDark }]}>
                    Создать группу
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    onOpenJoinFamily();
                  }}
                >
                  <Key size={15} color={colors.blue} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: colors.textDark }]}>
                    Ввести код
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Кнопка "Посмотреть участников текущей группы" */}
              {onOpenViewMembers && (
                <TouchableOpacity
                  style={[styles.viewMembersLink, { backgroundColor: colors.primaryLight }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    onOpenViewMembers();
                  }}
                >
                  <Users size={15} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.viewMembersLinkText, { color: colors.primary }]}>
                    Посмотреть участников активной группы
                  </Text>
                </TouchableOpacity>
              )}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  familiesScroll: {
    maxHeight: 280,
  },
  familiesList: {
    gap: 10,
    paddingBottom: 10,
  },
  familyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  famIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  famTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGroup: {
    flexDirection: 'row',
    marginRight: 8,
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  avatarOverlap: {
    marginLeft: -6,
  },
  miniAvatarText: {
    fontSize: 9,
    fontWeight: '700',
  },
  famMembersText: {
    fontSize: 11,
  },
  inspectMembersBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    marginLeft: 6,
  },
  inspectMembersBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  activeCheckPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  actionBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewMembersLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
    marginTop: 10,
  },
  viewMembersLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
