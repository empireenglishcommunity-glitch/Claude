// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Firebase JS SDK ships CommonJS files and uses the "exports" field in a way
// that Metro's package-exports resolution mishandles. These two lines are the
// documented fix so Firebase Auth/Firestore work in Expo Go.
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
