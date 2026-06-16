import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

/** A decorative gold rule with a centered diamond — imperial section break. */
export default function OrnamentDivider({ icon = 'rhombus' as keyof typeof MaterialCommunityIcons.glyphMap }) {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <MaterialCommunityIcons name={icon} size={12} color={colors.gold} style={styles.gem} />
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: colors.goldBorder },
  gem: { marginHorizontal: spacing.sm },
});
