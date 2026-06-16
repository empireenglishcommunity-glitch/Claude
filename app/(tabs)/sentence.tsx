import React, { useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import RoyalBackground from '../../src/components/RoyalBackground';
import EmpireCard from '../../src/components/EmpireCard';
import GoldButton from '../../src/components/GoldButton';
import SectionLabel from '../../src/components/SectionLabel';
import { brand, colors, radii, spacing, typography } from '../../src/theme';
import { speakAmerican, stopSpeaking, SpeechRate } from '../../src/services/speech';
import { useSettings } from '../../src/context/SettingsContext';

const STARTERS = [
  'Practice makes perfect.',
  'I would like a glass of water, please.',
  'What time does the meeting start?',
  'Learning English is a journey, not a race.',
  'Could you please repeat that more slowly?',
];

export default function SentenceScreen() {
  const { authenticVoice } = useSettings();
  const [text, setText] = useState('');
  const [rate, setRate] = useState<SpeechRate>('normal');
  const [speaking, setSpeaking] = useState(false);

  const speak = (value?: string) => {
    const target = (value ?? text).trim();
    if (!target) return;
    Keyboard.dismiss();
    speakAmerican(target, {
      rate,
      authentic: authenticVoice,
      onStart: () => setSpeaking(true),
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const stop = () => {
    stopSpeaking();
    setSpeaking(false);
  };

  return (
    <RoyalBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <MaterialCommunityIcons name="format-quote-open" size={26} color={colors.goldBright} />
            <Text style={styles.title}>Sentence Studio</Text>
          </View>
          <Text style={styles.subtitle}>
            انطق جُملة كاملة بلهجة أمريكية — لأن نطق الكلمة جوّه الجملة بيختلف عن نطقها لوحدها.
          </Text>

          <Animated.View entering={FadeInDown.duration(450)}>
            <EmpireCard style={{ marginTop: spacing.lg }}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Type any sentence…  اكتب أي جملة"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                multiline
                autoCapitalize="sentences"
              />
              <View style={styles.rateRow}>
                <Text style={styles.rateLabel}>Speed · السرعة</Text>
                <View style={styles.rateToggle}>
                  {(['slow', 'normal'] as SpeechRate[]).map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => setRate(r)}
                      style={[styles.rateOption, rate === r && styles.rateOptionActive]}
                    >
                      <MaterialCommunityIcons
                        name={r === 'slow' ? 'turtle' : 'rabbit'}
                        size={16}
                        color={rate === r ? colors.black : colors.gold}
                      />
                      <Text style={[styles.rateText, rate === r && styles.rateTextActive]}>
                        {r === 'slow' ? 'Slow' : 'Normal'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </EmpireCard>
          </Animated.View>

          <View style={styles.actions}>
            <GoldButton
              label={speaking ? 'Speaking…' : 'Pronounce  ·  انطق'}
              icon={speaking ? 'volume-high' : 'play'}
              onPress={() => speak()}
              loading={speaking}
              style={{ flex: 1 }}
            />
            <Pressable onPress={stop} style={styles.stopBtn}>
              <MaterialCommunityIcons name="stop" size={22} color={colors.gold} />
            </Pressable>
          </View>

          <View style={styles.startersBlock}>
            <SectionLabel title="Try these" icon="lightning-bolt" arabic="جرّب دي" />
            {STARTERS.map((s) => (
              <Pressable
                key={s}
                style={styles.starterRow}
                onPress={() => {
                  setText(s);
                  speak(s);
                }}
              >
                <MaterialCommunityIcons name="volume-high" size={18} color={colors.gold} />
                <Text style={styles.starterText}>{s}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sponsorRow}>
            <MaterialCommunityIcons name="shield-crown" size={13} color={colors.textMuted} />
            <Text style={styles.sponsor}>{brand.sponsor}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </RoyalBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    fontFamily: typography.serif,
    fontSize: typography.sizes.title,
    color: colors.goldBright,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    marginTop: spacing.sm,
    writingDirection: 'rtl',
    lineHeight: 22,
  },
  input: {
    color: colors.textPrimary,
    fontSize: typography.sizes.h3,
    minHeight: 96,
    textAlignVertical: 'top',
    lineHeight: 28,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,175,55,0.15)',
    paddingTop: spacing.md,
  },
  rateLabel: { color: colors.textMuted, fontSize: typography.sizes.small },
  rateToggle: { flexDirection: 'row', gap: spacing.sm },
  rateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
  rateOptionActive: { backgroundColor: colors.gold },
  rateText: { color: colors.gold, fontSize: typography.sizes.small, fontWeight: '700' },
  rateTextActive: { color: colors.black },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  stopBtn: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.goldBorder,
    backgroundColor: colors.goldFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startersBlock: { marginTop: spacing.xxl },
  starterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.charcoal,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.15)',
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  starterText: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.body },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xxl },
  sponsor: {
    color: colors.textMuted,
    fontSize: typography.sizes.tiny,
    letterSpacing: 2,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
  },
});
