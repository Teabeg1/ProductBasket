import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native';
import { AppText as Text } from '../components/AppText';
import {
  UserPlus,
  UserMinus,
  UserX,
  Settings,
  Palette,
  LogOut,
  ChevronRight,
  Users,
  Trash2,
  X,
  Pencil,
  PackagePlus,
  RefreshCw,
  Sparkles,
} from 'lucide-react-native';
import { useApp, type FamilyState } from '../context/AppContext';
import type { DevUser } from '../config/devConfig';
import { FamilyMembersModal } from '../components/FamilyMembersModal';
import { FamilySwitcherModal } from '../components/FamilySwitcherModal';
import { AddProductModal } from '../components/AddProductModal';
import { CustomProductsModal } from '../components/CustomProductsModal';

interface SettingsScreenProps {
  onOpenAddFamilyModal: () => void;
  onNavigateAdvancedSettings: () => void;
  onLogout: () => void;
  onNavigateToOnboarding: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onOpenAddFamilyModal,
  onNavigateAdvancedSettings,
  onLogout,
  onNavigateToOnboarding,
}) => {
  const {
    colors,
    theme,
    toggleTheme,
    t,
    family,
    families,
    currentUser,
    leaveFamily,
    removeMemberFromFamily,
    logout,
    updateUserName,
    updateFamilyName,
    deleteCustomProduct,
  } = useApp();

  const [removeMemberModalVisible, setRemoveMemberModalVisible] = useState(false);

  // Редактирование имени профиля
  const [editUserModalVisible, setEditUserModalVisible] = useState(false);
  const [userNameInput, setUserNameInput] = useState('');

  // Редактирование названия группы
  const [editFamilyModalVisible, setEditFamilyModalVisible] = useState(false);
  const [familyNameInput, setFamilyNameInput] = useState('');

  // Новые модальные окна для APK v2
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [switcherModalVisible, setSwitcherModalVisible] = useState(false);
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [customProductsModalVisible, setCustomProductsModalVisible] = useState(false);
  const [selectedFamilyForMembers, setSelectedFamilyForMembers] = useState<FamilyState | null>(null);

  const getMembersWord = (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) return 'участник';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'участника';
    return 'участников';
  };

  const handleOpenEditUser = () => {
    setUserNameInput(currentUser.name);
    setEditUserModalVisible(true);
  };

  const handleSaveUserName = () => {
    const trimmed = userNameInput.trim();
    if (!trimmed) {
      Alert.alert('Ошибка', 'Имя пользователя не может быть пустым');
      return;
    }
    updateUserName(trimmed);
    setEditUserModalVisible(false);
  };

  const handleOpenEditFamily = () => {
    if (!family) return;
    setFamilyNameInput(family.name);
    setEditFamilyModalVisible(true);
  };

  const handleSaveFamilyName = () => {
    const trimmed = familyNameInput.trim();
    if (!trimmed) {
      Alert.alert('Ошибка', 'Название группы не может быть пустым');
      return;
    }
    updateFamilyName(trimmed);
    setEditFamilyModalVisible(false);
  };

  const handleLogoutAccount = () => {
    Alert.alert(
      'Выход из аккаунта',
      `Вы действительно хотите выйти из аккаунта ${currentUser.name} (${currentUser.email})?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: () => {
            logout();
            onLogout();
          },
        },
      ]
    );
  };

  const handleLeaveFamily = () => {
    if (!family) return;
    Alert.alert(
      t('leaveFamily'),
      `Вы уверены, что хотите выйти из группы «${family.name}»?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('leaveFamily'),
          style: 'destructive',
          onPress: () => {
            leaveFamily();
            if (families.length <= 1) {
              onNavigateToOnboarding();
            }
          },
        },
      ]
    );
  };

  const handleConfirmRemoveMember = (member: DevUser) => {
    if (!family) return;
    Alert.alert(
      'Удалить из группы',
      `Вы действительно хотите удалить ${member.name} (${member.email}) из группы «${family.name}»?\n\nВсе товары, которые выбрал(а) ${member.name}, будут удалены из корзины этой группы.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            removeMemberFromFamily(member.id);
            setRemoveMemberModalVisible(false);
            Alert.alert('Успешно', `Участник ${member.name} удален(а) из группы.`);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textDark }]}>
          {t('settingsTitle')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* КАРТОЧКА ТЕКУЩЕГО АККАУНТА (КТО СЕЙЧАС СИДИТ) */}
        <View
          style={[
            styles.accountCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.accountAvatar,
              { backgroundColor: currentUser.avatarBg },
            ]}
          >
            <Text
              style={[
                styles.accountAvatarText,
                { color: currentUser.avatarColor },
              ]}
            >
              {currentUser.avatarChar}
            </Text>
          </View>
          <View style={styles.accountMeta}>
            <View style={styles.nameRow}>
              <Text style={[styles.accountName, { color: colors.textDark }]} numberOfLines={1}>
                {currentUser.name}
              </Text>
              
                <TouchableOpacity
                  style={[styles.cardEditBtn, { backgroundColor: colors.cardSecondary }]}
                  activeOpacity={0.7}
                  onPress={handleOpenEditUser}
                >
                  <Pencil size={14} color={colors.textDark} />
                </TouchableOpacity>
            </View>
            <Text style={[styles.accountEmail, { color: colors.textSecondary }]} numberOfLines={1}>
              {currentUser.email}
            </Text>
          </View>
        </View>

        {/* КАРТОЧКА СЕМЬИ (КЛИКАБЕЛЬНА: открывает список участников по нажатию на название семьи) */}
        {family ? (
          <View
            style={[
              styles.familyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity
              style={styles.familyCardBody}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedFamilyForMembers(family);
                setMembersModalVisible(true);
              }}
            >
              <View
                style={[
                  styles.famAvatar,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Users size={20} color={colors.primary} />
              </View>
              <View style={styles.famMetaBox}>
                <View style={styles.nameRow}>
                  <Text style={[styles.famName, { color: colors.textDark }]} numberOfLines={1}>
                    {family.name}
                  </Text>
                </View>
                <Text style={[styles.famMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {family.members.length} {getMembersWord(family.members.length)}
                </Text>
              </View>
            </TouchableOpacity>

            
              <TouchableOpacity
                style={[styles.cardEditBtn, { backgroundColor: colors.cardSecondary }]}
                activeOpacity={0.7}
                onPress={handleOpenEditFamily}
              >
                <Pencil size={14} color={colors.textDark} />
              </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.noFamilyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            activeOpacity={0.7}
            onPress={onNavigateToOnboarding}
          >
            <View style={styles.noFamilyLeft}>
              <Users size={22} color={colors.primary} style={{ marginRight: 12 }} />
              <View>
                <Text style={[styles.noFamilyTitle, { color: colors.textDark }]}>
                  Вы пока не в группе
                </Text>
                <Text style={[styles.noFamilySubtitle, { color: colors.primary }]}>
                  Создать группу или ввести код ➔
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Секция: Управление группами и товарами (если в группе) */}
        {family && (
          <View
            style={[
              styles.menuGroup,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >


            {/* КНОПКА: "Свои товары" (Requirement 3: пункт в меню настроек) */}
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => setCustomProductsModalVisible(true)}
            >
              <View style={styles.menuItemLeft}>
                <Sparkles size={18} color={colors.primary} style={{ marginRight: 12 }} />
                <Text style={[styles.menuItemText, { color: colors.textDark, fontWeight: '600' }]}>
                  Свои товары
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* КНОПКА: "Сменить группу" */}
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => setSwitcherModalVisible(true)}
            >
              <View style={styles.menuItemLeft}>
                <RefreshCw size={18} color={colors.blue} style={{ marginRight: 12 }} />
                <Text style={[styles.menuItemText, { color: colors.textDark, fontWeight: '600' }]}>
                  Сменить группу
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Добавить участника в группу по коду */}
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={onOpenAddFamilyModal}
            >
              <View style={styles.menuItemLeft}>
                <UserPlus size={18} color={colors.textDark} style={{ marginRight: 12 }} />
                <Text style={[styles.menuItemText, { color: colors.textDark }]}>
                  {t('addFamilyMember')}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Удалить из группы */}
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => setRemoveMemberModalVisible(true)}
            >
              <View style={styles.menuItemLeft}>
                <UserX size={18} color={colors.error} style={{ marginRight: 12 }} />
                <Text style={[styles.menuItemText, { color: colors.error }]}>
                  {t('removeFamilyMember')}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Выйти из группы */}
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={handleLeaveFamily}
            >
              <View style={styles.menuItemLeft}>
                <UserMinus size={18} color={colors.textSecondary} style={{ marginRight: 12 }} />
                <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>
                  {t('leaveFamily')}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Секция: Настройки приложения */}
        <View
          style={[
            styles.menuGroup,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={onNavigateAdvancedSettings}
          >
            <View style={styles.menuItemLeft}>
              <Settings size={18} color={colors.textDark} style={{ marginRight: 12 }} />
              <Text style={[styles.menuItemText, { color: colors.textDark }]}>
                {t('advancedSettings')}
              </Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={toggleTheme}
          >
            <View style={styles.menuItemLeft}>
              <Palette size={18} color={colors.textDark} style={{ marginRight: 12 }} />
              <Text style={[styles.menuItemText, { color: colors.textDark }]}>
                {t('appTheme')}
              </Text>
            </View>
            <View style={styles.menuItemRight}>
              <Text style={[styles.menuItemRightText, { color: colors.textSecondary }]}>
                {theme === 'dark' ? t('themeDark') : t('themeLight')}
              </Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Секция: КНОПКА ВЫЙТИ ИЗ АККАУНТА */}
        <View
          style={[
            styles.menuGroup,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={handleLogoutAccount}
          >
            <View style={styles.menuItemLeft}>
              <LogOut size={18} color={colors.error} style={{ marginRight: 12 }} />
              <Text style={[styles.menuItemText, { color: colors.error, fontWeight: '700' }]}>
                Выйти из аккаунта
              </Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Модальное окно: Список участников семьи (Requirement 3) */}
      <FamilyMembersModal
        visible={membersModalVisible}
        onClose={() => {
          setMembersModalVisible(false);
          setSelectedFamilyForMembers(null);
        }}
        targetFamily={selectedFamilyForMembers}
      />

      {/* Модальное окно: Переключение активной семьи (Requirement 1) */}
      <FamilySwitcherModal
        visible={switcherModalVisible}
        onClose={() => setSwitcherModalVisible(false)}
        onOpenCreateFamily={onNavigateToOnboarding}
        onOpenJoinFamily={onNavigateToOnboarding}
        onOpenViewMembers={(targetFam) => {
          setSelectedFamilyForMembers(targetFam || null);
          setMembersModalVisible(true);
        }}
      />

      {/* Модальное окно: Добавить свой товар (Requirement 2) */}
      <AddProductModal
        visible={addProductModalVisible}
        onClose={() => setAddProductModalVisible(false)}
      />

      {/* Модальное окно: Свои товары группы (Requirement 3: пункт Свои товары) */}
      <CustomProductsModal
        visible={customProductsModalVisible}
        onClose={() => setCustomProductsModalVisible(false)}
        onOpenAddProduct={() => setAddProductModalVisible(true)}
      />

      {/* Модальное окно: Выбор кого удалить из группы */}
      <Modal
        visible={removeMemberModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRemoveMemberModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setRemoveMemberModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalSheet,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.modalHandleWrap}>
                  <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                </View>

                <View style={styles.modalHeaderRow}>
                  <Text style={[styles.modalHeaderTitle, { color: colors.textDark }]}>
                    Удалить из группы
                  </Text>
                  <TouchableOpacity
                    style={[styles.modalCloseBtn, { backgroundColor: colors.cardSecondary }]}
                    onPress={() => setRemoveMemberModalVisible(false)}
                  >
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Выберите участника для исключения из «{family?.name}».
                </Text>

                <View style={styles.membersListContainer}>
                  {(() => {
                    const otherMembers = family?.members.filter((m) => m.id !== currentUser.id) || [];
                    if (otherMembers.length === 0) {
                      return (
                        <View style={styles.noOtherMembersBox}>
                          <Text style={[styles.noOtherMembersTitle, { color: colors.textDark }]}>
                            В группе пока нет других участников
                          </Text>
                          <Text style={[styles.noOtherMembersSubtitle, { color: colors.textSecondary }]}>
                            Вы не можете удалить себя через этот список. Чтобы покинуть группу, нажмите «Выйти из группы».
                          </Text>
                        </View>
                      );
                    }

                    return otherMembers.map((member) => (
                      <View
                        key={member.id}
                        style={[
                          styles.memberItemRow,
                          {
                            backgroundColor: colors.cardSecondary,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.memberItemLeft}>
                          <View
                            style={[
                              styles.memberItemAvatar,
                              { backgroundColor: member.avatarBg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.memberItemAvatarText,
                                { color: member.avatarColor },
                              ]}
                            >
                              {member.avatarChar}
                            </Text>
                          </View>
                          <View>
                            <Text style={[styles.memberItemName, { color: colors.textDark }]}>
                              {member.name}
                            </Text>
                            <Text
                              style={[styles.memberItemEmail, { color: colors.textSecondary }]}
                            >
                              {member.email}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[styles.memberDeleteBtn, { backgroundColor: colors.errorLight }]}
                          activeOpacity={0.7}
                          onPress={() => handleConfirmRemoveMember(member)}
                        >
                          <Trash2 size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ));
                  })()}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Модальное окно: Редактирование имени профиля */}
      <Modal
        visible={editUserModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditUserModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setEditUserModalVisible(false)}>
          <View style={styles.promptOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.promptCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.promptTitle, { color: colors.textDark }]}>
                  Редактировать имя профиля
                </Text>
                <Text style={[styles.promptSubtitle, { color: colors.textSecondary }]}>
                  Имя будет видно всем участникам совместной корзины
                </Text>

                <TextInput
                  style={[
                    styles.promptInput,
                    {
                      backgroundColor: colors.cardSecondary,
                      borderColor: colors.border,
                      color: colors.textDark,
                    },
                  ]}
                  value={userNameInput}
                  onChangeText={setUserNameInput}
                  placeholder="Ваше имя"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />

                <View style={styles.promptActions}>
                  <TouchableOpacity
                    style={[styles.promptCancelBtn, { backgroundColor: colors.cardSecondary }]}
                    activeOpacity={0.7}
                    onPress={() => setEditUserModalVisible(false)}
                  >
                    <Text style={[styles.promptCancelText, { color: colors.textSecondary }]}>
                      Отмена
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.promptSaveBtn, { backgroundColor: colors.primary }]}
                    activeOpacity={0.8}
                    onPress={handleSaveUserName}
                  >
                    <Text style={styles.promptSaveText}>Сохранить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Модальное окно: Редактирование названия группы */}
      <Modal
        visible={editFamilyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditFamilyModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setEditFamilyModalVisible(false)}>
          <View style={styles.promptOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.promptCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.promptTitle, { color: colors.textDark }]}>
                  Редактировать название группы
                </Text>
                <Text style={[styles.promptSubtitle, { color: colors.textSecondary }]}>
                  Например, «Комната 304» или «Домашний уют»
                </Text>

                <TextInput
                  style={[
                    styles.promptInput,
                    {
                      backgroundColor: colors.cardSecondary,
                      borderColor: colors.border,
                      color: colors.textDark,
                    },
                  ]}
                  value={familyNameInput}
                  onChangeText={setFamilyNameInput}
                  placeholder="Название группы"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />

                <View style={styles.promptActions}>
                  <TouchableOpacity
                    style={[styles.promptCancelBtn, { backgroundColor: colors.cardSecondary }]}
                    activeOpacity={0.7}
                    onPress={() => setEditFamilyModalVisible(false)}
                  >
                    <Text style={[styles.promptCancelText, { color: colors.textSecondary }]}>
                      Отмена
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.promptSaveBtn, { backgroundColor: colors.primary }]}
                    activeOpacity={0.8}
                    onPress={handleSaveFamilyName}
                  >
                    <Text style={styles.promptSaveText}>Сохранить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    gap: 14,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountAvatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  accountMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  accountEmail: {
    fontSize: 12,
  },
  familyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  familyCardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  famAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  famMetaBox: {
    flex: 1,
    justifyContent: 'center',
  },
  famName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  famMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  noFamilyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  noFamilyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noFamilyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  noFamilySubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  menuGroup: {
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  menuItemSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuItemRightText: {
    fontSize: 13,
  },
  divider: {
    height: 1,
  },
  customSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 8,
  },
  customSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  customProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  customProdLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customProdTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  customProdUnit: {
    fontSize: 11,
    marginTop: 1,
  },
  deleteCustomBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 23, 31, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  modalHandleWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 4,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  membersListContainer: {
    gap: 10,
  },
  memberItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  memberItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberItemAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  memberItemAvatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  memberItemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberItemEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  memberDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  cardEditBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noOtherMembersBox: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noOtherMembersTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  noOtherMembersSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  promptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 18, 24, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  promptCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  promptSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  promptInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 18,
  },
  promptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  promptCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  promptCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  promptSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  promptSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
