import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OrnamentDivider from '../src/components/OrnamentDivider';
import RoyalBackground from '../src/components/RoyalBackground';
import { colors } from '../src/theme';
import { extractClaimToken } from '../src/foundation/funnel/claimEntry';

/**
 * Telegram funnel claim entry (design §3.1) — a THIN app-shell route.
 *
 * Opening `empireenglish://claim?token=...` resolves here (the deep-link scheme
 * is declared in `app.json`, and Expo Router maps the route + `token` query to
 * this screen). The screen's only job is to surface that the claim was received
 * and hand the token to the Foundation SDK's funnel entry path
 * (`FoundationSdk.completeFunnelEntry` → sign-up → `redeemFunnelClaim`). The
 * actual sign-up UI belongs to a later project (P3/P8); this stays a thin shell
 * so P1 only wires the entry seam.
 */
export default function ClaimScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token?: string; link?: string }>();
  // Prefer the explicit `token` query; fall back to parsing a full link param.
  const token =
    (typeof params.token === 'string' && params.token) ||
    (typeof params.link === 'string' ? extractClaimToken(params.link) : null);

  return (
    <RoyalBackground variant="gate">
      <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]}>
        <Text style={styles.title}>Claim Received</Text>
        <OrnamentDivider />
        <Text style={styles.body}>
          {token
            ? 'Your invitation is verified. Finish creating your account to enter the Empire.'
            : 'This link is missing its claim token. Please reopen the link from your invitation.'}
        </Text>
      </View>
    </RoyalBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.gold, fontSize: 24, fontWeight: '800', letterSpacing: 2 },
  body: { color: colors.text, fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
