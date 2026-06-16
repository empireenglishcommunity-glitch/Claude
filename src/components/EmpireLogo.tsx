import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, typography } from '../theme';

type Props = {
  size?: number;
  showWordmark?: boolean;
};

/**
 * A code-rendered emblem inspired by the brand logo:
 * a gold crown above a shield bearing "E", framed by laurels —
 * no image asset required, so it scales crisply and ships offline.
 */
export default function EmpireLogo({ size = 120, showWordmark = true }: Props) {
  const shield = size;
  return (
    <View style={styles.wrap}>
      <View style={{ width: shield, alignItems: 'center' }}>
        {/* Crown */}
        <MaterialCommunityIcons
          name="crown"
          size={shield * 0.42}
          color={colors.goldBright}
          style={styles.crown}
        />
        {/* Shield with E */}
        <View style={styles.row}>
          <MaterialCommunityIcons
            name="leaf"
            size={shield * 0.4}
            color={colors.goldDeep}
            style={styles.laurelLeft}
          />
          <LinearGradient
            colors={gradients.goldSheen}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.shield,
              { width: shield * 0.62, height: shield * 0.72, borderRadius: shield * 0.12 },
            ]}
          >
            <View style={styles.shieldInner}>
              <Text style={[styles.eMark, { fontSize: shield * 0.42 }]}>E</Text>
            </View>
          </LinearGradient>
          <MaterialCommunityIcons
            name="leaf"
            size={shield * 0.4}
            color={colors.goldDeep}
            style={styles.laurelRight}
          />
        </View>
      </View>

      {showWordmark && (
        <View style={styles.wordmark}>
          <Text style={styles.empire}>EMPIRE</Text>
          <View style={styles.subRow}>
            <View style={styles.dash} />
            <Text style={styles.english}>ENGLISH</Text>
            <View style={styles.dash} />
          </View>
          <Text style={styles.community}>COMMUNITY</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  crown: { marginBottom: -6, zIndex: 2 },
  laurelLeft: { marginRight: -8, opacity: 0.85, transform: [{ scaleX: -1 }] },
  laurelRight: { marginLeft: -8, opacity: 0.85 },
  shield: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.goldBright,
  },
  shieldInner: {
    width: '86%',
    height: '88%',
    borderRadius: radii.md,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.goldBorder,
  },
  eMark: {
    fontFamily: typography.serif,
    fontWeight: '800',
    color: colors.goldBright,
  },
  wordmark: { alignItems: 'center', marginTop: 12 },
  empire: {
    fontFamily: typography.serif,
    fontSize: 26,
    letterSpacing: 6,
    color: colors.goldBright,
    fontWeight: '800',
  },
  subRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  english: {
    fontFamily: typography.serif,
    fontSize: 16,
    letterSpacing: 8,
    color: colors.gold,
    marginHorizontal: 8,
  },
  dash: { width: 18, height: 1, backgroundColor: colors.goldBorder },
  community: {
    fontFamily: typography.sans,
    fontSize: 10,
    letterSpacing: 6,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
