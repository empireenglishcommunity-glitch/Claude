import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

type Props = {
  title: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  arabic?: string;
};

export default function SectionLabel({ title, icon, arabic }: Props) {
  return (
    <View style={styles.row}>
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={colors.gold}
          style={{ marginRight: spacing.sm }}
        />
      )}
      <Text style={styles.title}>{title}</Text>
      {arabic ? <Text style={styles.arabic}>{arabic}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  title: {
    color: colors.gold,
    fontSize: typography.sizes.small,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  arabic: {
    color: colors.textMuted,
    fontSize: typography.sizes.small,
    marginLeft: spacing.sm,
    writingDirection: 'rtl',
  },
});
