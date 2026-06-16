import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  runOnJS,
  withDelay,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, shadows, spacing, typography } from '../theme';
import { useProgress } from '../context/ProgressContext';

/** Floating gold notification for XP gains and rank-ups. */
export default function XpToast() {
  const { lastEvent, consumeEvent } = useProgress();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!lastEvent) return;
    translateY.value = withSequence(
      withTiming(0, { duration: 350 }),
      withDelay(2200, withTiming(-120, { duration: 350 })),
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(2300, withTiming(0, { duration: 300 }, (finished) => {
        if (finished) runOnJS(consumeEvent)();
      })),
    );
  }, [lastEvent, translateY, opacity, consumeEvent]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!lastEvent) return null;

  const rankUp = lastEvent.rankUp;

  return (
    <SafeAreaView style={styles.host} pointerEvents="none" edges={['top']}>
      <Animated.View style={[styles.toastShadow, shadows.gold, style]}>
        <LinearGradient
          colors={gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.toast}
        >
          <MaterialCommunityIcons
            name={rankUp ? 'crown' : 'star-four-points'}
            size={22}
            color={colors.black}
          />
          <View style={{ marginLeft: spacing.sm }}>
            <Text style={styles.title}>
              {rankUp ? 'RANK UP! · ترقية!' : `+${lastEvent.amount} XP`}
            </Text>
            <Text style={styles.reason}>{lastEvent.reason}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 999 },
  toastShadow: { marginTop: spacing.sm, borderRadius: radii.pill },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.goldBright,
  },
  title: { color: colors.black, fontSize: typography.sizes.small, fontWeight: '900', letterSpacing: 0.5 },
  reason: { color: 'rgba(0,0,0,0.7)', fontSize: typography.sizes.tiny },
});
