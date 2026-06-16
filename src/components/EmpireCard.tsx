import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, shadows, spacing } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
};

/** A raised, gold-bordered "medallion" surface used for content blocks. */
export default function EmpireCard({ children, style, padded = true }: Props) {
  return (
    <View style={[styles.shadow, shadows.card, style]}>
      <LinearGradient
        colors={[colors.surfaceRaised, colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, padded && styles.padded]}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { borderRadius: radii.lg },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    overflow: 'hidden',
  },
  padded: { padding: spacing.lg },
});
