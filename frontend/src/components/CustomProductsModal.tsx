import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
} from 'react-native';
import { AppText as Text } from './AppText';
import { X, Sparkles, Trash2, Plus, ShoppingBag } from 'lucide-react-native';
import { useApp } from '../context/AppContext';

interface CustomProductsModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenAddProduct: () => void;
}

export const CustomProductsModal: React.FC<CustomProductsModalProps> = ({
  visible,
  onClose,
  onOpenAddProduct,
}) => {
  const { colors, family, deleteCustomProduct } = useApp();

  if (!family) return null;

  const rawCustomProducts = family.customProducts || [];
  const seenIds = new Set<string>();
  const customProducts = rawCustomProducts.filter((prod) => {
    const norm = prod.id.toLowerCase();
    if (seenIds.has(norm)) return false;
    seenIds.add(norm);
    return true;
  });

  const handleDeleteProduct = (productId: string, productTitle: string) => {
    Alert.alert(
      'Удалить свой товар',
      `Удалить товар «${productTitle}» из каталога группы «${family.name}»?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => deleteCustomProduct(family.id, productId),
        },
      ]
    );
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
                    <Sparkles size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.headerTitle, { color: colors.textDark }]} numberOfLines={1}>
                      Свои товары
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                      Группа «{family.name}» ({customProducts.length})
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

              {/* Список товаров */}
              {customProducts.length === 0 ? (
                <View
                  style={[
                    styles.emptyBox,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                  ]}
                >
                  <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
                    <ShoppingBag size={28} color={colors.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.textDark }]}>
                    Нет добавленных товаров
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    Вы можете создать собственные товары, которых нет в стандартном каталоге группы.
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      onClose();
                      onOpenAddProduct();
                    }}
                  >
                    <Plus size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
                    <Text style={styles.emptyAddBtnText}>Добавить свой товар</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <ScrollView
                    style={styles.productsScroll}
                    contentContainerStyle={styles.productsList}
                    showsVerticalScrollIndicator={false}
                  >
                    {customProducts.map((prod) => (
                      <View
                        key={prod.id}
                        style={[
                          styles.productRow,
                          {
                            backgroundColor: colors.cardSecondary,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.prodLeft}>
                          <View
                            style={[
                              styles.prodEmojiBox,
                              { backgroundColor: colors.card },
                            ]}
                          >
                            <Text style={{ fontSize: 22 }}>{prod.emoji}</Text>
                          </View>
                          <View style={styles.prodInfo}>
                            <Text
                              style={[styles.prodTitle, { color: colors.textDark }]}
                              numberOfLines={1}
                            >
                              {prod.title}
                            </Text>
                            <Text
                              style={[styles.prodUnit, { color: colors.textSecondary }]}
                              numberOfLines={1}
                            >
                              {prod.unit}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[styles.deleteBtn, { backgroundColor: colors.errorLight }]}
                          activeOpacity={0.7}
                          onPress={() => handleDeleteProduct(prod.id, prod.title)}
                        >
                          <Trash2 size={15} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>

                  {/* Кнопка "Добавить ещё товар" */}
                  <TouchableOpacity
                    style={[styles.addMoreBtn, { backgroundColor: colors.primary }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      onClose();
                      onOpenAddProduct();
                    }}
                  >
                    <Plus size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
                    <Text style={styles.addMoreBtnText}>Добавить ещё товар</Text>
                  </TouchableOpacity>
                </>
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
  emptyBox: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginVertical: 12,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  productsScroll: {
    maxHeight: 340,
  },
  productsList: {
    gap: 10,
    paddingBottom: 12,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  prodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  prodEmojiBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  prodInfo: {
    flex: 1,
  },
  prodTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  prodUnit: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 14,
    marginTop: 12,
  },
  addMoreBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
