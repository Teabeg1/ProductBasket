import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FloatingTabBar, type MainTabType } from '../components/FloatingTabBar';
import { CartScreen } from './CartScreen';
import { RolesScreen } from './RolesScreen';
import { EventsScreen } from './EventsScreen';
import { SettingsScreen } from './SettingsScreen';
import { CreateEventModal } from '../components/CreateEventModal';
import { AddFamilyModal } from '../components/AddFamilyModal';
import { useApp } from '../context/AppContext';
import type { AuthNavigationProp } from '../navigation/types';

export const MainTabsScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const { colors } = useApp();

  const [activeTab, setActiveTab] = useState<MainTabType>('Cart');

  // Modals visibility
  const [createEventModalVisible, setCreateEventModalVisible] = useState(false);
  const [addFamilyModalVisible, setAddFamilyModalVisible] = useState(false);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* Screen Body */}
      <View style={styles.content}>
        {activeTab === 'Cart' && (
          <CartScreen
            onOpenCreateFamily={() => navigation.navigate('Onboarding')}
            onOpenJoinFamily={() => navigation.navigate('Onboarding')}
          />
        )}
        {activeTab === 'Roles' && (
          <RolesScreen
            onGoToCart={() => setActiveTab('Cart')}
            onOpenCreateFamily={() => navigation.navigate('Onboarding')}
            onOpenJoinFamily={() => navigation.navigate('Onboarding')}
          />
        )}
        {activeTab === 'Events' && (
          <EventsScreen
            onOpenCreateEvent={() => setCreateEventModalVisible(true)}
            onNavigateToCart={() => setActiveTab('Cart')}
          />
        )}
        {activeTab === 'Settings' && (
          <SettingsScreen
            onOpenAddFamilyModal={() => setAddFamilyModalVisible(true)}
            onNavigateAdvancedSettings={() => navigation.navigate('AdvancedSettings')}
            onLogout={() => navigation.navigate('Login')}
            onNavigateToOnboarding={() => navigation.navigate('Onboarding')}
          />
        )}
      </View>

      {/* Floating Pill Tab Bar */}
      <FloatingTabBar activeTab={activeTab} onTabPress={setActiveTab} />

      {/* Frame 9 Modal: Создать мероприятие */}
      <CreateEventModal
        visible={createEventModalVisible}
        onClose={() => setCreateEventModalVisible(false)}
      />

      {/* Frame 10 Modal: Добавить в семью */}
      <AddFamilyModal
        visible={addFamilyModalVisible}
        onClose={() => setAddFamilyModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
