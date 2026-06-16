import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import RoyalBackground from '../src/components/RoyalBackground';
import EmpireCard from '../src/components/EmpireCard';
import OrnamentDivider from '../src/components/OrnamentDivider';
import LanguagePicker from '../src/components/LanguagePicker';
import { speakAmerican } from '../src/services/speech';
import { brand, colors, radii, spacing, typography } from '../src/theme';
import { useSettings } from '../src/context/SettingsContext';
import { useProgress } from '../src/context/ProgressContext';
import { useAuth } from '../src/context/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { authenticVoice, setAuthenticVoice } = useSettings();
  const { reset } = useProgress();
  const { configured, user, logOut } = useAuth();

  const previewVoice = (authentic: boolean) => {
    setAuthenticVoice(authentic);
    speakAmerican('Welcome to the Empire', { authentic });
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset progress?',
      'هيتم مسح الـ XP والرُتبة والكلمات اللي أتقنتها. متهيّأش يرجع تاني.',
      [
        { text: 'Cancel · إلغاء', style: 'cancel' },
        { text: 'Reset · مسح', style: 'destructive', onPress: () => reset() },
      ],
    );
  };

  return (
    <RoyalBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={colors.gold} />
          </Pressable>
          <Text style={styles.topTitle}>SETTINGS · الإعدادات</Text>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Authentic Voice */}
          <Text style={styles.section}>Pronunciation · النطق</Text>
          <EmpireCard>
            <View style={styles.row}>
              <MaterialCommunityIcons name="account-voice" size={24} color={colors.gold} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Authentic Voice</Text>
                <Text style={styles.rowSub}>
                  صوت أمريكي أنقى (أونلاين). لو مقفول، هيستخدم صوت الجهاز الأوفلاين.
                </Text>
              </View>
              <Switch
                value={authenticVoice}
                onValueChange={previewVoice}
                trackColor={{ false: colors.charcoal, true: colors.goldDeep }}
                thumbColor={authenticVoice ? colors.goldBright : colors.textMuted}
              />
            </View>
            <View style={styles.note}>
              <MaterialCommunityIcons
                name={authenticVoice ? 'wifi' : 'shield-check'}
                size={14}
                color={authenticVoice ? colors.gold : colors.success}
              />
              <Text style={styles.noteText}>
                {authenticVoice
                  ? 'محتاج اتصال بالإنترنت عشان يشتغل.'
                  : 'شغّال أوفلاين بالكامل.'}
              </Text>
            </View>
          </EmpireCard>

          <OrnamentDivider icon="translate" />

          {/* Default language */}
          <Text style={styles.section}>Translation · الترجمة</Text>
          <EmpireCard>
            <View style={styles.row}>
              <MaterialCommunityIcons name="translate" size={24} color={colors.gold} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Default language</Text>
                <Text style={styles.rowSub}>اللغة اللي بيظهر بيها معنى الكلمات.</Text>
              </View>
              <LanguagePicker />
            </View>
          </EmpireCard>

          <OrnamentDivider icon="crown" />

          {/* Danger zone */}
          <Text style={styles.section}>Account · الحساب</Text>
          {configured && user ? (
            <View style={styles.accountCard}>
              <MaterialCommunityIcons name="account-circle" size={24} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName}>{user.displayName || 'Citizen'}</Text>
                <Text style={styles.accountEmail}>{user.email}</Text>
              </View>
              <Pressable
                onPress={() => {
                  logOut();
                  router.replace('/');
                }}
                style={styles.signOutBtn}
              >
                <MaterialCommunityIcons name="logout" size={18} color={colors.gold} />
                <Text style={styles.signOutText}>Sign out</Text>
              </Pressable>
            </View>
          ) : null}
          <Pressable style={styles.dangerRow} onPress={confirmReset}>
            <MaterialCommunityIcons name="restore" size={22} color={colors.danger} />
            <Text style={styles.dangerText}>Reset my progress · إعادة ضبط التقدّم</Text>
          </Pressable>

          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>{brand.community}</Text>
            <View style={styles.sponsorRow}>
              <MaterialCommunityIcons name="shield-crown" size={13} color={colors.textMuted} />
              <Text style={styles.sponsor}>{brand.sponsor}</Text>
            </View>
            <Text style={styles.version}>v1.0.0</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </RoyalBackground>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: colors.textSecondary, fontSize: typography.sizes.tiny, letterSpacing: 3, fontWeight: '700' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  section: { color: colors.gold, fontSize: typography.sizes.small, fontWeight: '800', marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1 },
  rowTitle: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: '700' },
  rowSub: { color: colors.textMuted, fontSize: typography.sizes.small, marginTop: 2, writingDirection: 'rtl', lineHeight: 20 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(212,175,55,0.15)', paddingTop: spacing.md },
  noteText: { color: colors.textSecondary, fontSize: typography.sizes.small, writingDirection: 'rtl' },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(192,57,43,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.4)',
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  dangerText: { color: colors.danger, fontSize: typography.sizes.body, fontWeight: '700' },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.charcoal,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  accountName: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: '700' },
  accountEmail: { color: colors.textMuted, fontSize: typography.sizes.small },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.goldFaint,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  signOutText: { color: colors.gold, fontSize: typography.sizes.small, fontWeight: '700' },
  brandBlock: { alignItems: 'center', marginTop: spacing.xxxl },
  brandName: { fontFamily: typography.serif, fontSize: typography.sizes.body, color: colors.goldSoft, letterSpacing: 2 },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  sponsor: { color: colors.textMuted, fontSize: typography.sizes.tiny, letterSpacing: 2, marginLeft: spacing.xs, textTransform: 'uppercase' },
  version: { color: colors.textMuted, fontSize: typography.sizes.tiny, marginTop: spacing.sm },
});
