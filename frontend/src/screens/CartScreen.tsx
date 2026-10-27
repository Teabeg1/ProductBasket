import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { AppText as Text } from '../components/AppText';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Users,
  ChevronDown,
  Check,
  Sparkles,
  RefreshCw,
  Shield,
} from 'lucide-react-native';
import { useApp, type CatalogProduct, type FamilyState } from '../context/AppContext';
import { PRODUCT_IMAGES } from '../constants/productImages';
import { FamilySwitcherModal } from '../components/FamilySwitcherModal';
import { FamilyMembersModal } from '../components/FamilyMembersModal';

interface CartScreenProps {
  onOpenCreateFamily?: () => void;
  onOpenJoinFamily?: () => void;
}

const BASE_CATALOG_PRODUCTS: CatalogProduct[] = [
  { id: 'prod-apple', title: 'Яблоки', unit: '1 кг • Сезонные', imageKey: 'apple', emoji: '🍎' },
  { id: 'prod-milk', title: 'Молоко', unit: '930 мл • 3.2%', imageKey: 'milk', emoji: '🥛' },
  { id: 'prod-mayo', title: 'Майонез', unit: '380 мл • Провансаль', imageKey: 'mayo', emoji: '🥫' },
  { id: 'prod-cucumbers', title: 'Огурцы', unit: '600 г • Гладкие', imageKey: 'cucumbers', emoji: '🥒' },
  { id: 'prod-cheese', title: 'Сыр', unit: '200 г • Тильзитер', imageKey: 'cheese', emoji: '🧀' },
  { id: 'prod-pasta', title: 'Макароны', unit: '450 г • Перья', imageKey: 'pasta', emoji: '🍝' },
  { id: 'prod-sugar', title: 'Сахар', unit: '1 кг • Кристаллический', imageKey: 'sugar', emoji: '🍚' },
  { id: 'prod-salt', title: 'Соль', unit: '1 кг • Каменная мелкая', imageKey: 'salt', emoji: '🧂' },
];

export const CartScreen: React.FC<CartScreenProps> = ({
  onOpenCreateFamily,
  onOpenJoinFamily,
}) => {
  const {
    colors,
    t,
    cartItems,
    addToCart,
    decrementCartItem,
    deleteFromCart,
    totalCartItemsCount,
    isEventCart,
    activeCartTitle,
    openMainCart,
    family,
    families,
    currentUser,
    events,
    activeCartId,
  } = useApp();

  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [membersVisible, setMembersVisible] = useState(false);
  const [selectedFamilyForMembers, setSelectedFamilyForMembers] = useState<FamilyState | null>(null);


  const currentEvent = isEventCart ? events?.find((e) => e.id === activeCartId) : null;
  const isEventCompleted = Boolean(isEventCart && currentEvent?.isCompleted);

  // Каталог товаров объединяет базовые товары и пользовательские товары для текущей семьи
  const familyCustomProducts = family?.customProducts || [];
  const catalogProducts: CatalogProduct[] = [...BASE_CATALOG_PRODUCTS, ...familyCustomProducts];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.textDark }]} numberOfLines={1}>
            {isEventCart ? activeCartTitle : t('cartTitle')}
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

        {/* Строка переключения семьи / группы (если не корзина мероприятия) */}
        {!isEventCart && family && (
          <View style={styles.familyBar}>
            {/* Нажатие на название семьи открывает список участников (Requirement 3) */}
            <TouchableOpacity
              style={[
                styles.familyChip,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedFamilyForMembers(family);
                setMembersVisible(true);
              }}
            >
              <Users size={14} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.familyChipText, { color: colors.textDark }]} numberOfLines={1}>
                {family.name}
              </Text>
              <Text style={[styles.membersCountBadge, { color: colors.primary }]}>
                ({family.members.length} уч. ➔)
              </Text>
            </TouchableOpacity>

            {/* Кнопка смены группы */}
            <TouchableOpacity
              style={[
                styles.switchGroupBtn,
                { backgroundColor: colors.cardSecondary, borderColor: colors.border },
              ]}
              activeOpacity={0.7}
              onPress={() => setSwitcherVisible(true)}
            >
              <RefreshCw size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.switchGroupBtnText, { color: colors.textSecondary }]}>
                Сменить
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {totalCartItemsCount > 0 && (
          <View style={[styles.countBadge, { backgroundColor: colors.lime }]}>
            <Text style={[styles.countBadgeText, { color: colors.limeDark }]}>
              В корзине: {totalCartItemsCount} {t('itemsCountSuffix')}
            </Text>
          </View>
        )}
      </View>

      {/* Баннер завершенного мероприятия */}
      {isEventCompleted && (
        <View style={[styles.completedBanner, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
          <Shield size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.completedBannerText, { color: colors.textSecondary }]}>
            Мероприятие завершено. Корзина доступна только для просмотра.
          </Text>
        </View>
      )}

      {/* Баннер отсутствия группы */}
      {!family && !isEventCart && (
        <TouchableOpacity
          style={[styles.noFamilyBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => onOpenCreateFamily ? onOpenCreateFamily() : onOpenJoinFamily?.()}
        >
          <Text style={[styles.noFamilyText, { color: colors.textDark }]}>
            Вы пока не состоите в группе
          </Text>
          <Text style={[styles.noFamilySubtext, { color: colors.primary }]}>
            Создать группу или войти по коду ➔
          </Text>
        </TouchableOpacity>
      )}

      {/* 2-Column Product Grid */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {catalogProducts.map((prod) => {
            const activeCartItem = Object.values(cartItems).find(
              (it) => !it.isBought && (it.id === prod.id || it.title.toLowerCase() === prod.title.toLowerCase())
            );
            const boughtCartItem = Object.values(cartItems).find(
              (it) => it.isBought && (it.id === prod.id || it.title.toLowerCase() === prod.title.toLowerCase())
            );
            const inCartItem = activeCartItem || cartItems[prod.id];
            const count = activeCartItem ? activeCartItem.count : (inCartItem && !inCartItem.isBought ? inCartItem.count : 0);
            const isBought = !activeCartItem && Boolean(boughtCartItem);
            const targetCartId = inCartItem?.id || prod.id;
            const b64 = prod.imageKey ? PRODUCT_IMAGES[prod.imageKey] : null;
            const imageUri = b64 ? `data:image/jpeg;base64,${b64}` : null;
            const isCustom = prod.id.startsWith('custom-');

            return (
              <View
                key={prod.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: isBought
                      ? colors.success
                      : count > 0
                      ? colors.primary
                      : colors.border,
                    borderWidth: count > 0 || isBought ? 1.5 : 1,
                  },
                ]}
              >
                {/* Бейдж "Куплено" или "Свой товар" */}
                {isBought ? (
                  <View style={[styles.boughtBadge, { backgroundColor: colors.success }]}>
                    <Check size={11} color="#FFFFFF" strokeWidth={3} style={{ marginRight: 3 }} />
                    <Text style={styles.boughtBadgeText} numberOfLines={1}>
                      {inCartItem?.assignedToUserId === currentUser.id
                        ? 'Куплено вами'
                        : (() => {
                            const buyer = family?.members.find((m) => m.id === inCartItem?.assignedToUserId);
                            return buyer ? `Купил(а) ${buyer.name}` : 'Куплено';
                          })()}
                    </Text>
                  </View>
                ) : isCustom ? (
                  <View style={[styles.customBadge, { backgroundColor: colors.lime }]}>
                    <Sparkles size={10} color={colors.limeDark} style={{ marginRight: 3 }} />
                    <Text style={[styles.customBadgeText, { color: colors.limeDark }]}>Свой</Text>
                  </View>
                ) : null}

                {/* Image Box */}
                <View
                  style={[
                    styles.imageBox,
                    { backgroundColor: colors.cardSecondary },
                  ]}
                >
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.fallbackEmoji}>{prod.emoji}</Text>
                  )}
                </View>

                {/* Info & Action Row */}
                <View style={styles.infoRow}>
                  <View style={styles.titleBox}>
                    <Text
                      style={[
                        styles.productTitle,
                        {
                          color: colors.textDark,
                          textDecorationLine: isBought ? 'line-through' : 'none',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {prod.title}
                    </Text>
                    <Text
                      style={[styles.productUnit, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {prod.unit}
                    </Text>
                  </View>

                  {/* Add Button or Counter */}
                  {count === 0 ? (
                    <TouchableOpacity
                      style={[styles.addBtn, { backgroundColor: colors.primaryLight }]}
                      activeOpacity={0.7}
                      onPress={() => addToCart(prod)}
                    >
                      <Plus size={18} color={colors.primary} strokeWidth={2.8} />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.actionCol}>
                      <TouchableOpacity
                        style={[styles.trashBtn, { backgroundColor: colors.errorLight }]}
                        activeOpacity={0.7}
                        onPress={() => deleteFromCart(prod.id)}
                      >
                        <Trash2 size={13} color={colors.error} />
                      </TouchableOpacity>
                      <View
                        style={[
                          styles.counterBox,
                          { backgroundColor: colors.primaryLight },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.counterBtn}
                          onPress={() => decrementCartItem(prod.id)}
                        >
                          <Minus size={12} color={colors.primary} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={[styles.counterValue, { color: colors.primary }]}>
                          {count}
                        </Text>
                        <TouchableOpacity
                          style={styles.counterBtn}
                          onPress={() => addToCart(prod)}
                        >
                          <Plus size={12} color={colors.primary} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Модальное окно переключения семей */}
      <FamilySwitcherModal
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
        onOpenCreateFamily={() => {
          setSwitcherVisible(false);
          onOpenCreateFamily?.();
        }}
        onOpenJoinFamily={() => {
          setSwitcherVisible(false);
          onOpenJoinFamily?.();
        }}
        onOpenViewMembers={(targetFam) => {
          setSelectedFamilyForMembers(targetFam || null);
          setMembersVisible(true);
        }}
      />

      {/* Модальное окно участников семьи */}
      <FamilyMembersModal
        visible={membersVisible}
        onClose={() => {
          setMembersVisible(false);
          setSelectedFamilyForMembers(null);
        }}
        targetFamily={selectedFamilyForMembers}
      />
    </View>
  );
};

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 32 - 11) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  completedBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  noFamilyBanner: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  noFamilyText: {
    fontSize: 13,
    fontWeight: '700',
  },
  noFamilySubtext: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
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
    marginBottom: 6,
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
  familyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  familyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
  },
  familyChipText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  membersCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  switchGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  switchGroupBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  countBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 130, // Свободное пространство над FloatingTabBar
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 11,
  },
  card: {
    width: cardWidth,
    borderRadius: 18,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 4,
    position: 'relative',
  },
  boughtBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  boughtBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  customBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  imageBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  fallbackEmoji: {
    fontSize: 52,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  titleBox: {
    flex: 1,
    marginRight: 6,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  productUnit: {
    fontSize: 11,
    marginTop: 2,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trashBtn: {
    width: 26,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 4,
    height: 32,
  },
  counterBtn: {
    width: 20,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginBottom: 80,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
