/**
 * Jest configuration for the Empire English single-codebase project.
 *
 * Uses the `jest-expo` preset so tests run against the same Expo/React Native
 * transform pipeline as the app. Tests are organized under `__tests__/` into
 * three lanes — `unit/`, `property/` (fast-check), and `integration/` — each of
 * which has its own npm script (see package.json). All runs are single-run
 * (no watch mode) so they are CI-friendly.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  // Allow Babel to transform the Expo/React Native/Supabase ESM packages that
  // ship untranspiled sources. Everything else in node_modules is left as-is.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@supabase/.*))',
  ],
};
