import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AppText as Text } from '../components/AppText';
import {
  Plus,
  Trash2,
  ShoppingBag,
  Calendar,
  ArrowRight,
  FolderArchive,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  Users,
} from 'lucide-react-native';
import { useApp, type AppEvent } from '../context/AppContext';

interface EventsScreenProps {
  onOpenCreateEvent: () => void;
  onNavigateToCart: () => void;
}

type EventFilterTab = 'active' | 'completed';

export const EventsScreen: React.FC<EventsScreenProps> = ({
  onOpenCreateEvent,
  onNavigateToCart,
}) => {
  const {
    colors,
    t,
    events,
    deleteEvent,
    createEventCart,
    openEventCart,
    getEventCartStats,
    completeEvent,
    reopenEvent,
    families,
    activeFamilyId,
    refreshEvents,
  } = useApp();

  const [activeTab, setActiveTab] = useState<EventFilterTab>('active');
  const [selectedSpaceFilter, setSelectedSpaceFilter] = useState<string>('all');

  React.useEffect(() => {
    refreshEvents(activeFamilyId || undefined);
  }, [activeFamilyId]);


  // Фильтруем мероприятия: показываем только мероприятия групп, к которым текущий пользователь имеет доступ
  const userFamilyIds = families.map((f) => f.id.toLowerCase());
  const userEvents = events.filter((e) => !e.familyId || userFamilyIds.includes(e.familyId.toLowerCase()));

  // Фильтр по ползунку пространств (все мероприятия vs мероприятия конкретной группы)
  const effectiveSpaceFilter =
    selectedSpaceFilter === 'all' || families.some((f) => f.id.toLowerCase() === selectedSpaceFilter.toLowerCase())
      ? selectedSpaceFilter
      : 'all';

  const spaceFilteredEvents = userEvents.filter((e) => {
    if (effectiveSpaceFilter === 'all') return true;
    return e.familyId?.toLowerCase() === effectiveSpaceFilter.toLowerCase();
  });

  const activeEvents = spaceFilteredEvents.filter((e) => !e.isCompleted);
  const completedEvents = spaceFilteredEvents.filter((e) => !!e.isCompleted);

  const getCountWord = (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) return 'товар';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'товара';
    return 'товаров';
  };

  const handleDeleteEvent = (id: string, title: string) => {
    Alert.alert(
      t('deleteEventConfirmTitle'),
      `Вы уверены, что хотите удалить «${title}»?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => deleteEvent(id),
        },
      ]
    );
  };

  const handleCompleteEvent = (item: AppEvent) => {
    Alert.alert(
      'Завершить мероприятие',
      `Завершить мероприятие «${item.title}»?\n\nОно будет перемещено в папку «Завершенные мероприятия».`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Завершить',
          style: 'default',
          onPress: () => {
            completeEvent(item.id);
            Alert.alert('Мероприятие завершено', `«${item.title}» перемещено в папку «Завершенные мероприятия».`);
          },
        },
      ]
    );
  };

  const handleReopenEvent = (item: AppEvent) => {
    Alert.alert(
      'Возобновить мероприятие',
      `Вернуть «${item.title}» в список активных мероприятий?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Возобновить',
          onPress: () => {
            reopenEvent(item.id);
            setActiveTab('active');
          },
        },
      ]
    );
  };

  const handleCartAction = (item: AppEvent) => {
    const localStats = getEventCartStats(item.id);
    const hasCart = Boolean(item.hasCart || (item as any).cartStats?.total > 0 || localStats.total > 0);
    if (!hasCart) {
      createEventCart(item.id);
      Alert.alert(
        'Корзина создана!',
        `Совместная корзина для «${item.title}» готова. Теперь добавьте в неё товары.`,
        [
          {
            text: 'Добавить товары',
            onPress: () => {
              openEventCart(item.id);
              onNavigateToCart();
            },
          },
        ]
      );
    } else {
      openEventCart(item.id);
      onNavigateToCart();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textDark }]}>
          {t('eventsTitle')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Кнопка "+ Создать мероприятие" */}
        <TouchableOpacity
          style={[styles.createEventBtn, { backgroundColor: colors.textDark }]}
          activeOpacity={0.8}
          onPress={onOpenCreateEvent}
        >
          <Plus size={18} color={colors.card} strokeWidth={2.5} style={{ marginRight: 8 }} />
          <Text style={[styles.createEventBtnText, { color: colors.card }]}>
            {t('createEventBtn')}
          </Text>
        </TouchableOpacity>

        {/* Ползунок / Фильтр пространств: все мероприятия vs конкретная группа (Requirement 1) */}
        {families.length > 0 && (
          <View style={styles.spaceSliderWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.spaceSliderContent}
            >
              <TouchableOpacity
                style={[
                  styles.spacePill,
                  effectiveSpaceFilter === 'all'
                    ? [styles.spacePillActive, { backgroundColor: colors.textDark, borderColor: colors.textDark }]
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedSpaceFilter('all')}
              >
                <SlidersHorizontal
                  size={13}
                  color={effectiveSpaceFilter === 'all' ? colors.card : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.spacePillText,
                    { color: effectiveSpaceFilter === 'all' ? colors.card : colors.textDark },
                    effectiveSpaceFilter === 'all' && styles.spacePillTextActive,
                  ]}
                >
                  Все ({userEvents.length})
                </Text>
              </TouchableOpacity>

              {families.map((fam) => {
                const isSelected = effectiveSpaceFilter === fam.id;
                const count = userEvents.filter((e) => e.familyId === fam.id).length;
                return (
                  <TouchableOpacity
                    key={fam.id}
                    style={[
                      styles.spacePill,
                      isSelected
                        ? [styles.spacePillActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                        : { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setSelectedSpaceFilter(fam.id)}
                  >
                    <Users
                      size={13}
                      color={isSelected ? '#FFFFFF' : colors.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.spacePillText,
                        { color: isSelected ? '#FFFFFF' : colors.textDark },
                        isSelected && styles.spacePillTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {fam.name} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Переключатель папок: Активные мероприятия vs Завершенные мероприятия */}
        <View style={[styles.folderSwitcher, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.folderTab,
              activeTab === 'active' && [styles.folderTabActive, { backgroundColor: colors.card }],
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('active')}
          >
            <Calendar
              size={15}
              color={activeTab === 'active' ? colors.primary : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.folderTabText,
                { color: activeTab === 'active' ? colors.textDark : colors.textSecondary },
                activeTab === 'active' && styles.folderTabTextActive,
              ]}
            >
              Активные ({activeEvents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.folderTab,
              activeTab === 'completed' && [styles.folderTabActive, { backgroundColor: colors.card }],
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('completed')}
          >
            <FolderArchive
              size={15}
              color={activeTab === 'completed' ? colors.blue : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.folderTabText,
                { color: activeTab === 'completed' ? colors.textDark : colors.textSecondary },
                activeTab === 'completed' && styles.folderTabTextActive,
              ]}
            >
              📁 Завершенные ({completedEvents.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ===================== ВКЛАДКА 1: АКТИВНЫЕ МЕРОПРИЯТИЯ ===================== */}
        {activeTab === 'active' && (
          <>
            {activeEvents.length === 0 ? (
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
                  <Calendar size={32} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textDark }]}>
                  {t('eventsEmptyTitle')}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {t('eventsEmptySubtitle')}
                </Text>
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                  onPress={onOpenCreateEvent}
                >
                  <Text style={styles.emptyBtnText}>{t('createEventBtn')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.eventsList}>
                {activeEvents.map((item) => {
                  const localStats = getEventCartStats(item.id);
                  const hasCart = Boolean(item.hasCart || (item as any).cartStats?.total > 0 || localStats.total > 0);
                  const stats = hasCart ? (localStats.total > 0 ? localStats : ((item as any).cartStats || localStats)) : null;
                  const allBought = stats && stats.total > 0 && stats.total === stats.bought;
                  const eventFamily = families.find((f) => f.id.toLowerCase() === item.familyId?.toLowerCase());

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.eventCard,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      {/* Верхняя строка: Иконка + Заголовок + Завершить + Удалить */}
                      <View style={styles.topRow}>
                        <View style={styles.leftBox}>
                          <View
                            style={[
                              styles.emojiBadge,
                              { backgroundColor: colors.primaryLight },
                            ]}
                          >
                            <Text style={styles.emojiText}>{item.emoji}</Text>
                          </View>
                          <View style={styles.titleBox}>
                            <Text
                              style={[styles.eventTitle, { color: colors.textDark }]}
                            >
                              {item.title}
                            </Text>
                            <View style={styles.eventDateGroupRow}>
                              <Text
                                style={[
                                  styles.eventDateInfo,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {item.date}
                              </Text>
                              {eventFamily && (
                                <View style={[styles.eventGroupPill, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                                  <Text style={[styles.eventGroupPillText, { color: colors.primary }]}>
                                    {eventFamily.name}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>

                        <View style={styles.topActionsRow}>
                          {/* Кнопка "Завершить мероприятие" */}
                          <TouchableOpacity
                            style={[
                              styles.completeHeaderBtn,
                              { backgroundColor: colors.successLight },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => handleCompleteEvent(item)}
                          >
                            <CheckCircle2 size={14} color={colors.success} style={{ marginRight: 4 }} />
                            <Text style={[styles.completeHeaderBtnText, { color: colors.success }]}>
                              Завершить
                            </Text>
                          </TouchableOpacity>

                          {/* Удалить */}
                          <TouchableOpacity
                            style={[
                              styles.deleteBtn,
                              { backgroundColor: colors.errorLight },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => handleDeleteEvent(item.id, item.title)}
                          >
                            <Trash2 size={16} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Баннер "Все товары куплены" */}
                      {allBought && (
                        <TouchableOpacity
                          style={[styles.allBoughtBanner, { backgroundColor: colors.successLight }]}
                          activeOpacity={0.8}
                          onPress={() => handleCompleteEvent(item)}
                        >
                          <View style={styles.allBoughtBannerLeft}>
                            <Sparkles size={13} color={colors.success} style={{ marginRight: 6 }} />
                            <Text style={[styles.allBoughtBannerText, { color: colors.success }]}>
                              Все товары куплены!
                            </Text>
                          </View>
                          <View style={[styles.completeNowPill, { backgroundColor: colors.success }]}>
                            <Text style={styles.completeNowPillText}>Завершить ➔</Text>
                          </View>
                        </TouchableOpacity>
                      )}

                      {/* Счётчик товаров корзины мероприятия */}
                      {hasCart && stats ? (
                        <View
                          style={[
                            styles.cartStatsRow,
                            { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                          ]}
                        >
                          <ShoppingBag size={13} color={colors.primary} style={{ marginRight: 6 }} />
                          <Text style={[styles.cartStatsText, { color: colors.textDark }]}>
                            В корзине:{' '}
                            <Text style={{ fontWeight: '700' }}>
                              {stats.total > 0
                                ? `${stats.total} ${getCountWord(stats.total)}`
                                : 'нет товаров'}
                            </Text>
                            {stats.total > 0 && (
                              <Text style={{ color: colors.textSecondary }}>
                                {' '}({stats.assigned} выбрано • {stats.bought} куплено)
                              </Text>
                            )}
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.cartStatsRow,
                            { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                          ]}
                        >
                          <Text style={[styles.cartStatsText, { color: colors.textSecondary }]}>
                            Корзина ещё не создана
                          </Text>
                        </View>
                      )}

                      {/* Нижняя кнопка: "Создать корзину" или "Открыть корзину" */}
                      <TouchableOpacity
                        style={[
                          styles.cartActionBtn,
                          hasCart
                            ? { backgroundColor: colors.primary }
                            : { backgroundColor: colors.primaryLight },
                        ]}
                        activeOpacity={0.8}
                        onPress={() => handleCartAction(item)}
                      >
                        <ShoppingBag
                          size={15}
                          color={hasCart ? '#FFFFFF' : colors.primary}
                          strokeWidth={2.2}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.cartActionBtnText,
                            { color: hasCart ? '#FFFFFF' : colors.primary },
                          ]}
                        >
                          {hasCart ? t('openCartBtn') : t('createCartBtn')}
                        </Text>
                        {hasCart && (
                          <ArrowRight
                            size={14}
                            color="#FFFFFF"
                            style={{ marginLeft: 6 }}
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* ===================== ВКЛАДКА 2: ЗАВЕРШЕННЫЕ МЕРОПРИЯТИЯ ===================== */}
        {activeTab === 'completed' && (
          <>
            {completedEvents.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.emptyIconCircle,
                    { backgroundColor: colors.blueLight },
                  ]}
                >
                  <FolderArchive size={32} color={colors.blue} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textDark }]}>
                  Папка «Завершенные мероприятия» пуста
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Когда мероприятие закончится, нажмите «Завершить» на его карточке, и оно сохранится здесь для истории покупок.
                </Text>
              </View>
            ) : (
              <View style={styles.eventsList}>
                {completedEvents.map((item) => {
                  const localStats = getEventCartStats(item.id);
                  const stats = localStats.total > 0 ? localStats : ((item as any).cartStats || localStats);
                  const eventFamily = families.find((f) => f.id.toLowerCase() === item.familyId?.toLowerCase());

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.completedEventCard,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      {/* Верхняя строка */}
                      <View style={styles.topRow}>
                        <View style={styles.leftBox}>
                          <View
                            style={[
                              styles.emojiBadge,
                              { backgroundColor: colors.cardSecondary },
                            ]}
                          >
                            <Text style={styles.emojiText}>{item.emoji}</Text>
                          </View>
                          <View style={styles.titleBox}>
                            <View style={styles.completedTitleRow}>
                              <Text
                                style={[styles.eventTitle, { color: colors.textDark }]}
                              >
                                {item.title}
                              </Text>
                              <View style={[styles.completedBadge, { backgroundColor: colors.successLight }]}>
                                <CheckCircle2 size={11} color={colors.success} style={{ marginRight: 3 }} />
                                <Text style={[styles.completedBadgeText, { color: colors.success }]}>
                                  Завершено
                                </Text>
                              </View>
                            </View>
                            <View style={styles.eventDateGroupRow}>
                              <Text
                                style={[
                                  styles.eventDateInfo,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Проведено: {item.date} {item.completedAt ? `(закрыто ${item.completedAt})` : ''}
                              </Text>
                              {eventFamily && (
                                <View style={[styles.eventGroupPill, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                                  <Text style={[styles.eventGroupPillText, { color: colors.primary }]}>
                                    {eventFamily.name}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.deleteBtn,
                            { backgroundColor: colors.errorLight },
                          ]}
                          activeOpacity={0.7}
                          onPress={() => handleDeleteEvent(item.id, item.title)}
                        >
                          <Trash2 size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>

                      {/* Статистика покупок */}
                      {stats && stats.total > 0 && (
                        <View
                          style={[
                            styles.cartStatsRow,
                            { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                          ]}
                        >
                          <ShoppingBag size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
                          <Text style={[styles.cartStatsText, { color: colors.textSecondary }]}>
                            Куплено товаров:{' '}
                            <Text style={{ fontWeight: '700', color: colors.textDark }}>
                              {stats.total} {getCountWord(stats.total)}
                            </Text>
                          </Text>
                        </View>
                      )}

                      {/* Строка действий: Открыть архивную корзину / Возобновить */}
                      <View style={styles.completedActionsRow}>
                        <TouchableOpacity
                          style={[
                            styles.viewArchiveCartBtn,
                            { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                          ]}
                          activeOpacity={0.7}
                          onPress={() => {
                            openEventCart(item.id);
                            onNavigateToCart();
                          }}
                        >
                          <ShoppingBag size={14} color={colors.textDark} style={{ marginRight: 6 }} />
                          <Text style={[styles.viewArchiveCartBtnText, { color: colors.textDark }]}>
                            Посмотреть корзину
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.reopenBtn,
                            { backgroundColor: colors.blueLight },
                          ]}
                          activeOpacity={0.7}
                          onPress={() => handleReopenEvent(item)}
                        >
                          <RotateCcw size={14} color={colors.blue} style={{ marginRight: 6 }} />
                          <Text style={[styles.reopenBtnText, { color: colors.blue }]}>
                            Возобновить
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 130,
  },
  createEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  createEventBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  spaceSliderWrapper: {
    marginBottom: 12,
  },
  spaceSliderContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  spacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  spacePillActive: {
    borderWidth: 1.5,
  },
  spacePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  spacePillTextActive: {
    fontWeight: '700',
  },
  eventDateGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  eventGroupPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  eventGroupPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  folderSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  folderTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  folderTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  folderTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  folderTabTextActive: {
    fontWeight: '700',
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  completedEventCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    opacity: 0.88,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  leftBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completeHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  completeHeaderBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emojiBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  emojiText: {
    fontSize: 22,
  },
  titleBox: {
    flex: 1,
  },
  completedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  eventDateInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allBoughtBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  allBoughtBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  allBoughtBannerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  completeNowPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completeNowPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cartStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  cartStatsText: {
    fontSize: 12,
  },
  cartActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 12,
  },
  cartActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  completedActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  viewArchiveCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
  },
  viewArchiveCartBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reopenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  reopenBtnText: {
    fontSize: 12,
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
    textAlign: 'center',
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
  stage1Title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  stage1Subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
