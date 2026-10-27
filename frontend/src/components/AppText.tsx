import React, { forwardRef } from 'react';
import { Text as RNText, TextProps, StyleSheet, TextStyle } from 'react-native';
import { useApp } from '../context/AppContext';

export const AppText = forwardRef<any, TextProps>(({ style, ...props }, ref) => {
  const { fontScaleMultiplier = 1.12 } = useApp();

  if (fontScaleMultiplier === 1) {
    return <RNText ref={ref} style={style} {...props} />;
  }

  const flattened = StyleSheet.flatten(style) as TextStyle | undefined;
  
  const originalFontSize = typeof flattened?.fontSize === 'number' ? flattened.fontSize : 14;
  const scaledFontSize = Math.round(originalFontSize * fontScaleMultiplier);

  const scaledStyle: TextStyle = {
    fontSize: scaledFontSize,
    ...(typeof flattened?.lineHeight === 'number'
      ? { lineHeight: Math.round(flattened.lineHeight * fontScaleMultiplier) }
      : {}),
  };

  return <RNText ref={ref} style={[style, scaledStyle]} {...props} />;
});

AppText.displayName = 'AppText';
