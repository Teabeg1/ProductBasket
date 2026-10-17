import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardTypeOptions,
  ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Colors, Radii } from '../constants/theme';
import { useApp } from '../context/AppContext';

interface AppInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  isPassword?: boolean;
  leftIcon?: React.ReactNode;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  style?: ViewStyle;
}

export const AppInput: React.FC<AppInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  isPassword = false,
  leftIcon,
  error,
  keyboardType = 'default',
  autoCapitalize = 'none',
  style,
}) => {
  const { colors } = useApp();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
          isFocused && { borderColor: colors.primary, backgroundColor: colors.card },
          error ? { borderColor: colors.error } : null,
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, { color: colors.textDark }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {isPassword && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
          >
            {showPassword ? (
              <EyeOff size={19} color={colors.textMuted} />
            ) : (
              <Eye size={19} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  inputWrapper: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.input,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputWrapperFocused: {
    borderColor: Colors.borderFocus,
    backgroundColor: '#FFFFFF',
  },
  inputWrapperError: {
    borderColor: Colors.error,
  },
  leftIconContainer: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: Colors.textDark,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 6,
    marginLeft: 6,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 2,
  },
});
