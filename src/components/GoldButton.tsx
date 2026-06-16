import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, gradients, radii, shadows, spacing, typography } from '../theme';

type Props = {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  variant?: 'solid' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export default function GoldButton({
  label,
  onPress,
  icon,
  variant = 'solid',
  loading = false,
  disabled = false,
  style,
}: Props) {
  const isOutline = variant === 'outline';

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.gold : colors.black} />
      ) : (
        <>
          {icon && (
            <MaterialCommunityIcons
              name={icon}
              size={20}
              color={isOutline ? colors.gold : colors.black}
              style={{ marginRight: spacing.sm }}
            />
          )}
          <Text style={[styles.label, isOutline && styles.labelOutline]}>{label}</Text>
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        shadows.gold,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {isOutline ? (
        <View style={[styles.fill, styles.outline]}>{content}</View>
      ) : (
        <LinearGradient
          colors={gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        >
          {content}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.pill, overflow: 'hidden' },
  fill: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.goldFaint,
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: {
    color: colors.black,
    fontSize: typography.sizes.body,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  labelOutline: { color: colors.gold },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
});
