import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AppText as Text } from '../components/AppText';
import {
  Check,
  ShoppingBag,
  Lock,
  Users,
  ChevronDown,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';
import { useApp, type FamilyState } from '../context/AppContext';
import { PRODUCT_IMAGES } from '../constants/productImages';
import { FamilyMembersModal } from '../components/FamilyMembersModal';
import { FamilySwitcherModal } from '../components/FamilySwitcherModal';

interface RolesScreenProps {
  onGoToCart?: () => void;
  onOpenCreateFamily?: () => void;
  onOpenJoinFamily?: () => void;
}

type FilterTab = 'all' | 'mine' | 'unassigned' | 'bought';

export const RolesScreen: React.FC<RolesScreenProps> = ({
  onGoToCart,
  onOpenCreateFamily,
  onOpenJoinFamily,
}) => {
  const {
    colors,
    t,
    family,
    currentUser,
    cartItems,
    assignCartItem,
    toggleItemPurchased,
    isEventCart,
    activeCartTitle,
    openMainCart,
    events,
    activeCartId,
  } = useApp();

  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [switcherModalVisible, setSwitcherModalVisible] = useState(false);
  const [selectedFamilyForMembers, setSelectedFamilyForMembers] = useState<FamilyState | null>(null);

  const activeEvent = events.find((e) => e.id.toLowerCase() === activeCartId.toLowerCase());
  const isEventCompleted = isEventCart && !!activeEvent?.isCompleted;

  const itemsList = Object.values(cartItems);
  const totalCount = itemsList.length;

  const myCount = itemsList.filter((item) => item.assignedToUserId?.toLowerCase() === currentUser.id?.toLowerCase()).length;
  const unassignedCount = itemsList.filter((item) => item.assignedToUserId === null).length;
  const boughtCount = itemsList.filter((item) => item.isBought).length;

  const filteredItems = itemsList.filter((item) => {
    if (filterTab === 'mine') return item.assignedToUserId?.toLowerCase() === currentUser.id?.toLowerCase();
    if (filterTab === 'unassigned') return item.assignedToUserId === null;
    if (filterTab === 'bought') return !!item.isBought;
    return true;
  });

  const allAssigned = totalCount > 0 && itemsList.every((item) => item.assignedToUserId !== null);
  const allBought = totalCount > 0 && itemsList.every((item) => !!item.isBought);

  // Нажатие на назначение товара
  const handleAssignPress = (itemId: string) => {
    if (isEventCompleted) {
      Alert.alert('Мероприятие завершено', 'Корзина завершенного мероприятия доступна только для чтения.');
      return;
    }
    const result = assignCartItem(itemId);
    if (!result.success && result.message) {
      Alert.alert('Товар занят', result.message);
    }
  };

  // Нажатие на статус "Куплено"
  const handleTogglePurchased = (itemId: string, itemTitle: string) => {
    if (isEventCompleted) {
      Alert.alert('Мероприятие завершено', 'Корзина завершенного мероприятия доступна только для чтения.');
      return;
    }
    const result = toggleItemPurchased(itemId);
    if (!result.success && result.message) {
      Alert.alert('Статус «Куплено»', result.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.textDark }]} numberOfLines={1}>
            {t('rolesTitle')}
          </Text>
          {isEventCart && (
            <TouchableOpacity
              style={[styles.returnMainBtn, { backgroundColor: colors.primaryLight }]}
              activeOpacity={0.7}
              onPress={openMainCart}
            >
              <Text style={[styles.returnMainBtnText, { color: colors.primary }]}>
                ← К общей
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!family && !isEventCart ? (
        <View style={styles.emptyCard}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
            <ShoppingBag size={32} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textDark }]}>
            Вы пока не состоите в группе
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Чтобы просматривать и распределять товары, создайте группу или присоединитесь по коду.
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
            activeOpacity={0.8}
            onPress={() => (onOpenCreateFamily ? onOpenCreateFamily() : onOpenJoinFamily?.())}
          >
            <Text style={styles.emptyBtnText}>Создать группу или войти по коду</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isEventCompleted && (
            <View
              style={{
                backgroundColor: colors.cardSecondary,
                borderColor: colors.border,
                borderWidth: 1,
                padding: 12,
                borderRadius: 12,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Lock size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.textSecondary, fontSize: 13, flex: 1 }}>
                Мероприятие завершено. Распределение доступно только для чтения.
              </Text>
            </View>
          )}
        {/* Инфо-бейдж семьи (КЛИКАБЕЛЕН: открывает список участников по нажатию на название семьи) */}
        <TouchableOpacity
          style={[
            styles.familyBadgeCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          activeOpacity={0.7}
          onPress={() => {
            setSelectedFamilyForMembers(family);
            setMembersModalVisible(true);
          }}
        >
          <View style={styles.famLeft}>
            {family && family.members.length > 0 ? (
              <>
                <View style={styles.avatarGroup}>
                  {family.members.map((member, index) => (
                    <View
                      key={member.id}
                      style={[
                        styles.miniAvatar,
                        index > 0 && styles.avatarOverlap,
                        {
                          backgroundColor: member.avatarBg,
                          borderColor: colors.card,
                        },
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
                  ))}
                </View>
                <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                  <View style={styles.famTitleRow}>
                    <Text style={[styles.famTitleText, { color: colors.textDark }]} numberOfLines={1}>
                      {family.name}
                    </Text>
                    <ChevronDown size={14} color={colors.textSecondary} style={{ marginLeft: 3 }} />
                  </View>
                  <Text style={[styles.memberCountText, { color: colors.primary }]} numberOfLines={1} ellipsizeMode="tail">
                    {family.members.length} участников • Список ➔
                  </Text>
                </View>
              </>
            ) : (
              <Text style={[styles.memberCountText, { color: colors.textSecondary }]}>
                Вы не состоите в группе
              </Text>
            )}
          </View>

          {/* Правая часть бейджа: статус распределения и кнопка смены группы */}
          <View style={styles.famRight}>
            {!isEventCart && (
              <TouchableOpacity
                style={[styles.switchGroupBtn, { backgroundColor: colors.cardSecondary }]}
                activeOpacity={0.7}
                onPress={() => setSwitcherModalVisible(true)}
              >
                <Users size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.switchGroupBtnText, { color: colors.textSecondary }]}>
                  Сменить
                </Text>
              </TouchableOpacity>
            )}

            {totalCount > 0 && (
              allBought ? (
                <View style={[styles.donePill, { backgroundColor: colors.successLight }]}>
                  <Text style={[styles.donePillText, { color: colors.success }]}>
                    ✓ Все куплено
                  </Text>
                </View>
              ) : allAssigned ? (
                <View style={[styles.donePill, { backgroundColor: colors.lime }]}>
                  <Text style={[styles.donePillText, { color: colors.limeDark }]}>
                    {t('allChosen')}
                  </Text>
                </View>
              ) : (
                <View style={[styles.pendingPill, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.pendingPillText, { color: colors.primary }]}>
                    {itemsList.filter((i) => i.assignedToUserId).length}/{totalCount}
                  </Text>
                </View>
              )
            )}
          </View>
        </TouchableOpacity>

        {/* Заголовок списка товаров */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>
            {t('itemsToBuy')} ({totalCount})
          </Text>
        </View>

        {/* Фильтры: Все / Только мои / Свободные / Куплено */}
        {totalCount > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabsRow}
          >
            <TouchableOpacity
              style={[
                styles.filterTab,
                filterTab === 'all'
                  ? [styles.filterTabActive, { backgroundColor: colors.card, borderColor: colors.primary }]
                  : { backgroundColor: colors.cardSecondary, borderColor: colors.border },
              ]}
              activeOpacity={0.7}
              onPress={() => setFilterTab('all')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: filterTab === 'all' ? colors.primary : colors.textSecondary },
                  filterTab === 'all' && styles.filterTabTextActive,
                ]}
              >
                Все ({totalCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                filterTab === 'mine'
                  ? [styles.filterTabActive, { backgroundColor: colors.card, borderColor: colors.limeDark }]
                  : { backgroundColor: colors.cardSecondary, borderColor: colors.border },
              ]}
              activeOpacity={0.7}
              onPress={() => setFilterTab('mine')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: filterTab === 'mine' ? colors.limeDark : colors.textSecondary },
                  filterTab === 'mine' && styles.filterTabTextActive,
                ]}
              >
                Мои ({myCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                filterTab === 'unassigned'
                  ? [styles.filterTabActive, { backgroundColor: colors.card, borderColor: colors.blue }]
                  : { backgroundColor: colors.cardSecondary, borderColor: colors.border },
              ]}
              activeOpacity={0.7}
              onPress={() => setFilterTab('unassigned')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: filterTab === 'unassigned' ? colors.blue : colors.textSecondary },
                  filterTab === 'unassigned' && styles.filterTabTextActive,
                ]}
              >
                Свободные ({unassignedCount})
              </Text>
            </TouchableOpacity>

            {/* Фильтр 4: Куплено */}
            <TouchableOpacity
              style={[
                styles.filterTab,
                filterTab === 'bought'
                  ? [styles.filterTabActive, { backgroundColor: colors.card, borderColor: colors.success }]
                  : { backgroundColor: colors.cardSecondary, borderColor: colors.border },
              ]}
              activeOpacity={0.7}
              onPress={() => setFilterTab('bought')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: filterTab === 'bought' ? colors.success : colors.textSecondary },
                  filterTab === 'bought' && styles.filterTabTextActive,
                ]}
              >
                Куплено ({boughtCount})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Если корзина пуста */}
        {totalCount === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <ShoppingBag size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textDark }]}>
              {t('cartEmptyTitle')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {t('cartEmptySubtitle')}
            </Text>
            {onGoToCart && (
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
                onPress={onGoToCart}
              >
                <Text style={styles.emptyBtnText}>{t('goToCatalog')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : filteredItems.length === 0 ? (
          <View
            style={[
              styles.emptyFilterCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.emptyFilterTitle, { color: colors.textDark }]}>
              Нет товаров в данном фильтре
            </Text>
            <Text style={[styles.emptyFilterSubtitle, { color: colors.textSecondary }]}>
              Попробуйте переключить вкладку на «Все»
            </Text>
          </View>
        ) : (
          /* Список реальных товаров с правилом распределения и статусом "Куплено" */
          <View style={styles.itemsList}>
            {filteredItems.map((item) => {
              const b64 = item.imageKey ? PRODUCT_IMAGES[item.imageKey] : null;
              const imageUri = b64 ? `data:image/jpeg;base64,${b64}` : null;
              const isAssignedToMe = !!item.assignedToUserId && item.assignedToUserId.toLowerCase() === currentUser.id.toLowerCase();
              const isAssignedToOther = !!item.assignedToUserId && !isAssignedToMe;
              const assignedUser = family?.members.find((m) => m.id.toLowerCase() === item.assignedToUserId?.toLowerCase());

              return (
                <View
                  key={item.id}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: item.isBought
                        ? colors.success
                        : isAssignedToMe
                        ? colors.lime
                        : colors.border,
                      borderWidth: item.isBought || isAssignedToMe ? 1.5 : 1,
                      opacity: item.isBought ? 0.72 : 1,
                    },
                  ]}
                >
                  {/* Чекбокс / кнопка статуса "Куплено" */}
                  <TouchableOpacity
                    style={[
                      styles.boughtCheckbox,
                      {
                        borderColor: item.isBought
                          ? colors.success
                          : isAssignedToMe
                          ? colors.limeDark
                          : colors.border,
                        backgroundColor: item.isBought ? colors.success : 'transparent',
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleTogglePurchased(item.id, item.title)}
                  >
                    {item.isBought && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                  </TouchableOpacity>

                  {/* Картинка товара */}
                  <View
                    style={[
                      styles.thumbBox,
                      { backgroundColor: colors.cardSecondary },
                    ]}
                  >
                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.thumbImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                    )}
                  </View>

                  {/* Название и граммовка */}
                  <View style={styles.itemDetails}>
                    <Text
                      style={[
                        styles.itemTitle,
                        {
                          color: item.isBought ? colors.textMuted : colors.textDark,
                          textDecorationLine: item.isBought ? 'line-through' : 'none',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[styles.itemUnit, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {item.count} шт • {item.unit}
                    </Text>
                    {item.isBought && (
                      <Text
                        style={[styles.boughtStatusSubtext, { color: colors.success }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {isAssignedToMe ? '✓ Куплено вами' : `✓ Купил(а) ${assignedUser ? assignedUser.name : 'участник'}`}
                      </Text>
                    )}
                  </View>

                  {/* Кнопка / бейдж распределения и статуса */}
                  <View style={styles.actionCol}>
                    {item.isBought ? (
                      // ТОВАР УЖЕ КУПЛЕН: Кнопка для выбравшего / Бейдж для остальных участников
                      isAssignedToMe ? (
                        <TouchableOpacity
                          style={[styles.boughtStatusBtn, { backgroundColor: colors.successLight, borderColor: colors.success }]}
                          activeOpacity={0.7}
                          onPress={() => handleTogglePurchased(item.id, item.title)}
                        >
                          <CheckCircle2 size={13} color={colors.success} strokeWidth={2.6} style={{ marginRight: 4 }} />
                          <Text style={[styles.boughtStatusBtnText, { color: colors.success }]}>
                            Куплено
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View
                          style={[styles.boughtStatusBtn, { backgroundColor: colors.successLight, borderColor: colors.success, opacity: 0.95 }]}
                        >
                          <CheckCircle2 size={13} color={colors.success} strokeWidth={2.6} style={{ marginRight: 4 }} />
                          <Text style={[styles.boughtStatusBtnText, { color: colors.success }]} numberOfLines={1}>
                            Куплено
                          </Text>
                        </View>
                      )
                    ) : isAssignedToMe ? (
                      // ТОВАР ВЗЯЛ Я: Кнопка "Куплю я" + возможность сразу отметить "Куплено"
                      <View style={styles.assignedActionsRow}>
                        <TouchableOpacity
                          style={[styles.actionBtnSelf, { backgroundColor: colors.lime }]}
                          activeOpacity={0.7}
                          onPress={() => handleAssignPress(item.id)}
                        >
                          <Check
                            size={13}
                            color={colors.limeDark}
                            strokeWidth={2.8}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={[styles.actionBtnSelfText, { color: colors.limeDark }]}>
                            Куплю я
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.markBoughtBtn, { backgroundColor: colors.successLight }]}
                          activeOpacity={0.7}
                          onPress={() => handleTogglePurchased(item.id, item.title)}
                        >
                          <Text style={[styles.markBoughtBtnText, { color: colors.success }]}>
                            Купил?
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : isAssignedToOther ? (
                      // ТОВАР ВЗЯЛ ДРУГОЙ: Заблокированный бейдж с замком
                      <TouchableOpacity
                        style={[
                          styles.assigneeBadge,
                          {
                            backgroundColor: assignedUser ? assignedUser.avatarBg : colors.cardSecondary,
                          },
                        ]}
                        activeOpacity={0.8}
                        onPress={() => handleAssignPress(item.id)}
                      >
                        <Lock
                          size={12}
                          color={assignedUser?.avatarColor || colors.textSecondary}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.assigneeText,
                            { color: assignedUser?.avatarColor || colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          Купит {assignedUser ? assignedUser.name.split(' ')[0] : 'другой'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      // НЕ НАЗНАЧЕНО: Серый бейдж
                      <TouchableOpacity
                        style={[
                          styles.unassignedBtn,
                          {
                            backgroundColor: colors.cardSecondary,
                            borderColor: colors.border,
                          },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => handleAssignPress(item.id)}
                      >
                        <Text style={[styles.unassignedBtnText, { color: colors.textSecondary }]}>
                          Не назначено
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Карточка подсказки */}
        {totalCount > 0 && (
          <View
            style={[
              styles.hintCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.hintTitle, { color: colors.textDark }]}>
              💡 Статус «Куплено» и распределение ролей
            </Text>
            <Text style={[styles.hintSubtitle, { color: colors.textSecondary }]}>
              1. Нажмите «Не назначено», чтобы взять товар на себя («Куплю я»).{'\n'}
              2. После покупки товара в магазине нажмите чекбокс или «Купил?», чтобы отметить его статусом «Куплено».{'\n'}
              3. Нажмите на название группы вверху, чтобы посмотреть полный список участников!
            </Text>
          </View>
        )}
      </ScrollView>
      )}

      {/* Модальное окно участников семьи (Requirement 3) */}
      <FamilyMembersModal
        visible={membersModalVisible}
        onClose={() => {
          setMembersModalVisible(false);
          setSelectedFamilyForMembers(null);
        }}
        targetFamily={selectedFamilyForMembers}
      />

      {/* Модальное окно переключения семьи (Requirement 1) */}
      <FamilySwitcherModal
        visible={switcherModalVisible}
        onClose={() => setSwitcherModalVisible(false)}
        onOpenCreateFamily={() => {
          setSwitcherModalVisible(false);
          onOpenCreateFamily?.();
        }}
        onOpenJoinFamily={() => {
          setSwitcherModalVisible(false);
          onOpenJoinFamily?.();
        }}
        onOpenViewMembers={(targetFam) => {
          setSelectedFamilyForMembers(targetFam || null);
          setMembersModalVisible(true);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    flex: 1,
  },
  returnMainBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 8,
  },
  returnMainBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 130,
  },
  familyBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  famLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  avatarGroup: {
    flexDirection: 'row',
    marginRight: 10,
  },
  miniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
  },
  famTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  famTitleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  memberCountText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  famRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  switchGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  switchGroupBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  donePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  donePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pendingPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  filterTab: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterTabActive: {
    borderWidth: 1.5,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    fontWeight: '700',
  },
  emptyFilterCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 14,
  },
  emptyFilterTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyFilterSubtitle: {
    fontSize: 12,
  },
  itemsList: {
    gap: 10,
    marginBottom: 14,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  boughtCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  thumbBox: {
    width: 54,
    height: 54,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemUnit: {
    fontSize: 12,
    marginTop: 2,
  },
  boughtStatusSubtext: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  actionCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
    maxWidth: 140,
  },
  assignedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnSelf: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionBtnSelfText: {
    fontSize: 11,
    fontWeight: '700',
  },
  markBoughtBtn: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 10,
  },
  markBoughtBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  boughtStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 130,
  },
  boughtStatusBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  assigneeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 10,
    maxWidth: 120,
  },
  assigneeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  unassignedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  unassignedBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 20,
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hintCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  hintTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  hintSubtitle: {
    fontSize: 11,
    lineHeight: 17,
  },
  stage1EmptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginBottom: 80,
  },
  stage1IconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
});
