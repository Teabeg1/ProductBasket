import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, Users, Calendar, SlidersHorizontal } from 'lucide-react-native';
import { useApp } from '../context/AppContext';

export type MainTabType = 'Cart' | 'Roles' | 'Events' | 'Settings';

interface FloatingTabBarProps {
  activeTab: MainTabType;
  onTabPress: (tab: MainTabType) => void;
}

export const FloatingTabBar: React.FC<FloatingTabBarProps> = ({ activeTab, onTabPress }) => {
  const insets = useSafeAreaInsets();
  const { colors, t } = useApp();

  const tabs: {
    id: MainTabType;
    label: string;
    icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
    fontSize?: number;
  }[] = [
    { id: 'Cart', label: t('tabCart'), icon: ShoppingBag },
    { id: 'Roles', label: t('tabRoles'), icon: Users },
    { id: 'Events', label: t('tabEvents'), icon: Calendar, fontSize: 9.5 },
    { id: 'Settings', label: t('tabSettings'), icon: SlidersHorizontal },
  ];

  // Рассчитываем динамический нижний отступ, чтобы не перекрывать кнопки навигации Android
  const dynamicBottom = Math.max(insets.bottom + 12, 28);

  return (
    <View
      style={[styles.floatingContainer, { bottom: dynamicBottom }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const IconComponent = tab.icon;
          const iconColor = isActive ? colors.limeDark : colors.textMuted;

          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.7}
              onPress={() => onTabPress(tab.id)}
              style={[
                styles.tabItem,
                isActive && { backgroundColor: colors.lime },
              ]}
            >
              <IconComponent size={18} color={iconColor} strokeWidth={isActive ? 2.4 : 1.8} />
              <Text
                style={[
                  styles.tabLabel,
                  tab.fontSize ? { fontSize: tab.fontSize } : null,
                  {
                    color: isActive ? colors.limeDark : colors.textMuted,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 328,
    maxWidth: '92%',
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 4,
    paddingVertical: 4,
    // Drop shadow
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});
