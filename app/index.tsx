import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RoyalBackground from '../src/components/RoyalBackground';
import BrandLogo from '../src/components/BrandLogo';
import GoldButton from '../src/components/GoldButton';
import { brand, colors, spacing, typography } from '../src/theme';
import { useAuth } from '../src/context/AuthContext';

/**
 * Cinematic imperial gate: the throne-room opens, the emblem rises,
 * the sponsor is honored, then the user enters the Empire (or signs in).
 */
export default function SplashGate() {
  const router = useRouter();
  const { configured, user } = useAuth();
  const gateGlow = useSharedValue(0);

  useEffect(() => {
    gateGlow.value = withDelay(200, withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }));
  }, [gateGlow]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.15 + gateGlow.value * 0.35 }));

  const enter = () => {
    if (configured && !user) router.replace('/auth');
    else router.replace('/(tabs)');
  };

  return (
    <RoyalBackground>
      <Animated.View style={[styles.crownHalo, glowStyle]} pointerEvents="none">
        <MaterialCommunityIcons name="crown" size={260} color={colors.gold} />
      </Animated.View>

      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Animated.View entering={FadeInDown.duration(900)}>
            <BrandLogo size={210} />
          </Animated.View>

          <Animated.Text entering={FadeIn.delay(700).duration(900)} style={styles.tagline}>
            {brand.tagline}
          </Animated.Text>
          <Animated.Text entering={FadeIn.delay(1000).duration(900)} style={styles.taglineAr}>
            تكلّم الإنجليزية بلهجة أمريكية… كإمبراطور.
          </Animated.Text>
        </View>

        <Animated.View entering={FadeInUp.delay(1200).duration(900)} style={styles.footer}>
          <GoldButton label="Enter the Empire  ·  ادخل الإمبراطورية" icon="login-variant" onPress={enter} />
          <View style={styles.sponsorRow}>
            <MaterialCommunityIcons name="shield-crown" size={14} color={colors.textMuted} />
            <Text style={styles.sponsor}>{brand.sponsor}</Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </RoyalBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between' },
  crownHalo: { position: 'absolute', top: 40, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tagline: {
    fontFamily: typography.serif,
    fontSize: typography.sizes.h2,
    color: colors.textPrimary,
    marginTop: spacing.xxl,
    letterSpacing: 1,
  },
  taglineAr: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    writingDirection: 'rtl',
  },
  footer: { paddingBottom: spacing.xl },
  sponsorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  sponsor: {
    color: colors.textMuted,
    fontSize: typography.sizes.tiny,
    letterSpacing: 2,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
  },
});
