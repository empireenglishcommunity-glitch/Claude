import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../theme';

/** The "Empire flame" — daily streak indicator. */
export default function StreakFlame({ streak }: { streak: number }) {
  const lit = streak > 0;
  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons
        name="fire"
        size={26}
        color={lit ? colors.goldBright : colors.textMuted}
      />
      <Text style={[styles.count, !lit && { color: colors.textMuted }]}>{streak}</Text>
      <Text style={styles.label}>day streak{'\n'}شعلة يومية</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.goldFaint,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  count: { color: colors.goldBright, fontSize: typography.sizes.title, fontWeight: '800' },
  label: { color: colors.textSecondary, fontSize: typography.sizes.tiny, lineHeight: 14 },
});
