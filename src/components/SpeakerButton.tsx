import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, shadows } from '../theme';
import { speakAmerican, SpeechRate } from '../services/speech';

type Props = {
  text: string;
  rate?: SpeechRate;
  size?: number;
};

/** A circular gold speaker that pulses while the American voice plays. */
export default function SpeakerButton({ text, rate = 'normal', size = 64 }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (speaking) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [speaking, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.5 - pulse.value * 0.4,
    transform: [{ scale: 1 + pulse.value * 0.6 }],
  }));

  const handlePress = () => {
    speakAmerican(text, {
      rate,
      onStart: () => setSpeaking(true),
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2 },
          ringStyle,
        ]}
        pointerEvents="none"
      />
      <Pressable onPress={handlePress} style={({ pressed }) => pressed && { transform: [{ scale: 0.94 }] }}>
        <LinearGradient
          colors={gradients.goldSheen}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.btn,
            shadows.gold,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <MaterialCommunityIcons
            name={speaking ? 'volume-high' : 'volume-medium'}
            size={size * 0.5}
            color={colors.black}
          />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    backgroundColor: colors.gold,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.goldBright,
  },
});
