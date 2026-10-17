import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Volume2,
  ChevronRight,
  Shield,
  Trash2,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import type { AuthNavigationProp } from '../navigation/types';

export const AdvancedSettingsScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const { colors, language, toggleLanguage, t } = useApp();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [takeProductNotify, setTakeProductNotify] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      t('deleteAccount'),
      'Это действие необратимо. Все ваши данные будут стерты.',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            navigation.navigate('Login');
          },
        },
      ]
    );
  };

  const handleChangePassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card }]}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={18} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textDark }]}>
          {t('advSettingsTitle')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Секция 1: Уведомления */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            {t('notificationsHeader')}
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.toggleRow}>
              <View style={styles.rowLeft}>
                <Bell size={18} color={colors.textDark} style={{ marginRight: 12 }} />
                <Text style={[styles.rowLabel, { color: colors.textDark }]}>
                  {t('pushNotifications')}
                </Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.toggleRow}>
              <View style={styles.rowLeft}>
                <CheckCircle2 size={18} color={colors.textDark} style={{ marginRight: 12 }} />
                <Text style={[styles.rowLabel, { color: colors.textDark }]}>
                  {t('notifyItemTaken')}
                </Text>
              </View>
              <Switch
                value={takeProductNotify}
                onValueChange={setTakeProductNotify}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.toggleRow}>
              <View style={styles.rowLeft}>
                <Volume2 size={18} color={colors.textDark} style={{ marginRight: 12 }} />
                <Text style={[styles.rowLabel, { color: colors.textDark }]}>
                  {t('notifySound')}
                </Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Секция 2: Язык интерфейса */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            {t('languageHeader')}
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity
              style={styles.actionRow}
              activeOpacity={0.7}
              onPress={toggleLanguage}
            >
              <View>
                <Text style={[styles.rowTitle, { color: colors.textDark }]}>
                  {t('languageLabel')}
                </Text>
                <Text style={[styles.rowSubtitle, { color: colors.blue }]}>
                  {language === 'ru' ? 'Русский (Россия)' : 'English (US)'}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Секция 3: Аккаунт и безопасность */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            {t('securityHeader')}
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity
              style={styles.actionRow}
              activeOpacity={0.7}
              onPress={handleChangePassword}
            >
              <View style={styles.rowLeft}>
                <Shield size={18} color={colors.textDark} style={{ marginRight: 12 }} />
                <Text style={[styles.rowLabel, { color: colors.textDark }]}>
                  {t('changePassword')}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.actionRow}
              activeOpacity={0.7}
              onPress={handleDeleteAccount}
            >
              <View style={styles.rowLeft}>
                <Trash2 size={18} color={colors.error} style={{ marginRight: 12 }} />
                <Text style={[styles.rowLabel, { color: colors.error, fontWeight: '600' }]}>
                  {t('deleteAccount')}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  navTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },
  section: {},
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
  },
});
