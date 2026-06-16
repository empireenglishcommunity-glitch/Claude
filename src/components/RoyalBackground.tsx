import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Adds faint radial gold glow at the top, like a throne-room light. */
  glow?: boolean;
};

/**
 * The base imperial backdrop used across every screen:
 * deep black -> warm imperial brown gradient with an optional gold glow.
 */
export default function RoyalBackground({ children, style, glow = true }: Props) {
  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={gradients.royalBg}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {glow && (
        <LinearGradient
          colors={['rgba(212,175,55,0.18)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
          style={styles.glow}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
});
