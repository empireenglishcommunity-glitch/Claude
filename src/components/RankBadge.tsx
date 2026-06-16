import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, shadows, typography } from '../theme';
import { Rank } from '../data/ranks';

type Props = { rank: Rank; size?: number };

/** A circular gold medallion showing the user's imperial rank icon. */
export default function RankBadge({ rank, size = 72 }: Props) {
  return (
    <View style={[styles.outer, shadows.gold, { width: size, height: size, borderRadius: size / 2 }]}>
      <LinearGradient
        colors={gradients.goldSheen}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.ring, { borderRadius: size / 2 }]}
      >
        <View style={[styles.inner, { borderRadius: size / 2 }]}>
          <MaterialCommunityIcons name={rank.icon} size={size * 0.5} color={colors.goldBright} />
        </View>
      </LinearGradient>
    </View>
  );
}

export function RankPill({ rank }: { rank: Rank }) {
  return (
    <View style={styles.pill}>
      <MaterialCommunityIcons name={rank.icon} size={14} color={colors.goldBright} />
      <Text style={styles.pillText}>{rank.title}</Text>
      <Text style={styles.pillAr}>{rank.titleAr}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { alignItems: 'center', justifyContent: 'center' },
  ring: { flex: 1, width: '100%', padding: 3, alignItems: 'center', justifyContent: 'center' },
  inner: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.goldBorder,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.goldFaint,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { color: colors.goldBright, fontSize: typography.sizes.small, fontWeight: '800' },
  pillAr: { color: colors.textMuted, fontSize: typography.sizes.tiny, writingDirection: 'rtl' },
});
