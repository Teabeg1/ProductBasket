import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Type } from 'lucide-react-native';
import { useApp, type FontScaleLevel } from '../context/AppContext';
import { AppText as Text } from './AppText';

interface ScaleOption {
  key: FontScaleLevel;
  label: string;
}

const SCALE_OPTIONS: ScaleOption[] = [
  { key: 'small', label: 'Мелкий' },
  { key: 'medium', label: 'Обычный' },
  { key: 'large', label: 'Крупный' },
];

export const TextScaleSlider: React.FC = () => {
  const { colors, fontScale, setFontScale } = useApp();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Type size={18} color={colors.textDark} style={{ marginRight: 10 }} />
          <Text style={[styles.title, { color: colors.textDark }]}>
            Масштаб
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.segmentedContainer,
          { backgroundColor: colors.cardSecondary, borderColor: colors.border },
        ]}
      >
        {SCALE_OPTIONS.map((opt) => {
          const isSelected = opt.key === fontScale;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.segmentButton,
                isSelected && [
                  styles.segmentButtonActive,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ],
              ]}
              activeOpacity={0.7}
              onPress={() => setFontScale(opt.key)}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: isSelected ? colors.primary : colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  segmentButtonActive: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
  },
});
