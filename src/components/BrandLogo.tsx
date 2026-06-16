import React from 'react';
import { Image, StyleSheet } from 'react-native';

/**
 * Displays the official brand logo image (assets/logo.png).
 * Replace assets/logo.png with the real Empire English Community emblem.
 */
export default function BrandLogo({ size = 150 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={[styles.logo, { width: size, height: size, borderRadius: size / 2 }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {},
});
