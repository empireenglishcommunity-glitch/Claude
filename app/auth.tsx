import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import RoyalBackground from '../src/components/RoyalBackground';
import BrandLogo from '../src/components/BrandLogo';
import GoldButton from '../src/components/GoldButton';
import { brand, colors, radii, spacing, typography } from '../src/theme';
import { useAuth } from '../src/context/AuthContext';

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('اكتب الإيميل وكلمة السر.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('اكتب اسمك.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') await signUp(email, password, name);
      else await signIn(email, password);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      setError(friendlyError(code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <RoyalBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.logoWrap}>
              <BrandLogo size={120} />
              <Text style={styles.title}>{brand.community}</Text>
              <Text style={styles.subtitle}>
                {mode === 'login' ? 'سجّل دخولك لإمبراطوريتك' : 'أنشئ حسابك وابدأ رحلتك'}
              </Text>
            </View>

            <View style={styles.form}>
              {mode === 'signup' && (
                <Field
                  icon="account"
                  placeholder="Name · الاسم"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              )}
              <Field
                icon="email"
                placeholder="Email · البريد"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Field
                icon="lock"
                placeholder="Password · كلمة السر"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              {error && (
                <View style={styles.errorRow}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {busy ? (
                <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.lg }} />
              ) : (
                <GoldButton
                  label={mode === 'login' ? 'Log in  ·  دخول' : 'Create account  ·  إنشاء حساب'}
                  icon={mode === 'login' ? 'login-variant' : 'account-plus'}
                  onPress={submit}
                  style={{ marginTop: spacing.lg }}
                />
              )}

              <Pressable
                style={styles.switchRow}
                onPress={() => {
                  setError(null);
                  setMode(mode === 'login' ? 'signup' : 'login');
                }}
              >
                <Text style={styles.switchText}>
                  {mode === 'login'
                    ? 'لسه ماعندكش حساب؟ أنشئ واحد'
                    : 'عندك حساب؟ سجّل دخول'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.sponsorRow}>
              <MaterialCommunityIcons name="shield-crown" size={13} color={colors.textMuted} />
              <Text style={styles.sponsor}>{brand.sponsor}</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RoyalBackground>
  );
}

function Field({
  icon,
  ...props
}: { icon: keyof typeof MaterialCommunityIcons.glyphMap } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.gold} />
      <TextInput
        {...props}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
    </View>
  );
}

function friendlyError(code: string): string {
  if (code.includes('email-already-in-use')) return 'الإيميل ده مستخدم بالفعل — سجّل دخول.';
  if (code.includes('invalid-email')) return 'الإيميل مش صحيح.';
  if (code.includes('weak-password')) return 'كلمة السر ضعيفة (6 حروف على الأقل).';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'الإيميل أو كلمة السر غلط.';
  if (code.includes('network')) return 'مفيش اتصال بالإنترنت.';
  return 'حصلت مشكلة، حاول تاني.';
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xl },
  title: {
    fontFamily: typography.serif,
    fontSize: typography.sizes.h2,
    color: colors.goldBright,
    fontWeight: '800',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  subtitle: { color: colors.textSecondary, fontSize: typography.sizes.body, marginTop: 4, writingDirection: 'rtl' },
  form: {},
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.charcoal,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    paddingHorizontal: spacing.lg,
    height: 54,
    marginBottom: spacing.md,
  },
  input: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.body },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  errorText: { color: colors.danger, fontSize: typography.sizes.small, writingDirection: 'rtl', flex: 1 },
  switchRow: { alignItems: 'center', marginTop: spacing.lg },
  switchText: { color: colors.gold, fontSize: typography.sizes.small, fontWeight: '600', writingDirection: 'rtl' },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xxl },
  sponsor: { color: colors.textMuted, fontSize: typography.sizes.tiny, letterSpacing: 2, marginLeft: spacing.xs },
});
