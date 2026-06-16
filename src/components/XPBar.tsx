import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, typography } from '../theme';
import { RankProgress } from '../data/ranks';

/** Animated gold progress bar toward the next rank. */
export default function XPBar({ rank }: { rank: RankProgress }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(rank.ratio, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [rank.ratio, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View>
      <View style={styles.track}>
        <Animated.View style={[styles.fillWrap, fillStyle]}>
          <LinearGradient
            colors={['#FBE9A0', '#D4AF37', '#A6801F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fill}
          />
        </Animated.View>
      </View>
      <View style={styles.labels}>
        {rank.next ? (
          <Text style={styles.label}>
            {rank.xpForNext} XP → {rank.next.title} ({rank.next.titleAr})
          </Text>
        ) : (
          <Text style={styles.label}>Maximum rank reached · أعلى رتبة 👑</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    overflow: 'hidden',
  },
  fillWrap: { height: '100%' },
  fill: { flex: 1, borderRadius: radii.pill },
  labels: { marginTop: 6, alignItems: 'center' },
  label: { color: colors.textSecondary, fontSize: typography.sizes.tiny, letterSpacing: 0.5 },
});
