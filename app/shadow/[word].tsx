import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  createAudioPlayer,
} from 'expo-audio';

import RoyalBackground from '../../src/components/RoyalBackground';
import EmpireCard from '../../src/components/EmpireCard';
import GoldButton from '../../src/components/GoldButton';
import SpeakerButton from '../../src/components/SpeakerButton';
import { colors, radii, spacing, typography } from '../../src/theme';
import { lookupWord } from '../../src/services/dictionary';
import { WordEntry } from '../../src/data/types';
import { useProgress } from '../../src/context/ProgressContext';
import { useSettings } from '../../src/context/SettingsContext';
import { assessPronunciation, hasAiKey, PronunciationResult } from '../../src/services/ai';

const SHADOW_XP = 8;

export default function ShadowScreen() {
  const router = useRouter();
  const { addXp } = useProgress();
  const { aiKey } = useSettings();
  const aiEnabled = hasAiKey(aiKey);
  const params = useLocalSearchParams<{ word: string }>();
  const word = String(params.word ?? '').trim();

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [entry, setEntry] = useState<WordEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [myUri, setMyUri] = useState<string | null>(null);
  const [rated, setRated] = useState(false);
  const [assessing, setAssessing] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);

  useEffect(() => {
    let active = true;
    lookupWord(word).then((res) => {
      if (!active) return;
      setEntry(res.status === 'found' ? res.entry : null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [word]);

  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone needed', 'لازم تسمح باستخدام الميكروفون عشان تسجّل صوتك.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
      setMyUri(null);
    } catch {
      Alert.alert('Error', 'حصلت مشكلة في بدء التسجيل.');
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
    } catch {
      // ignore
    }
    setRecording(false);
    const uri = recorder.uri ?? null;
    setMyUri(uri);
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch {
      // ignore
    }
    if (uri && aiEnabled) runAssessment(uri);
  };

  const runAssessment = async (uri: string) => {
    if (!entry || !aiEnabled) return;
    setAssessing(true);
    setResult(null);
    const r = await assessPronunciation(entry.word, uri, aiKey);
    setAssessing(false);
    if (r) {
      setResult(r);
      const earned = SHADOW_XP + Math.round(r.score / 20); // up to +5 bonus
      addXp(earned, 'Shadowing · تقييم AI');
    } else {
      setResult({
        score: 0,
        heard: '',
        feedback: 'تعذّر الاتصال بالـ AI — اتأكد من الإنترنت ومن مفتاح OpenAI في الإعدادات.',
        passed: false,
      });
    }
  };

  const playMine = () => {
    if (!myUri) return;
    try {
      const player = createAudioPlayer(myUri);
      const sub = player.addListener('playbackStatusUpdate', (s) => {
        if (s.didJustFinish) {
          sub.remove();
          try {
            player.remove();
          } catch {
            // ignore
          }
        }
      });
      player.play();
    } catch {
      // ignore
    }
  };

  const finish = (stars: number) => {
    setRated(true);
    addXp(SHADOW_XP + stars, 'Shadowing · تدريب النطق');
    setTimeout(() => router.back(), 700);
  };

  if (loading) {
    return (
      <RoyalBackground>
        <SafeAreaView style={styles.centerFill}>
          <ActivityIndicator color={colors.gold} size="large" />
        </SafeAreaView>
      </RoyalBackground>
    );
  }

  if (!entry) {
    return (
      <RoyalBackground>
        <SafeAreaView style={styles.centerFill}>
          <MaterialCommunityIcons name="cloud-off-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errText}>"{word}" غير متاح للتدريب الآن.</Text>
          <GoldButton label="Back · رجوع" icon="chevron-left" onPress={() => router.back()} />
        </SafeAreaView>
      </RoyalBackground>
    );
  }

  return (
    <RoyalBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={24} color={colors.gold} />
          </Pressable>
          <Text style={styles.topTitle}>SHADOWING · تقليد النطق</Text>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            اسمع النطق الأصلي، بعدين سجّل صوتك وانت بتقوله، وقارن بينهم. كرّر لحد ما يطابق 🎙️
          </Text>

          {/* Step 1: original */}
          <Text style={styles.stepLabel}>1 · The Empire's voice · النطق الأصلي</Text>
          <EmpireCard style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Text style={styles.word}>{entry.word}</Text>
            <Text style={styles.ipa}>{entry.ipaUS}</Text>
            <View style={{ height: spacing.md }} />
            <SpeakerButton text={entry.word} size={72} />
          </EmpireCard>

          {/* Step 2: record */}
          <Text style={styles.stepLabel}>2 · Your voice · صوتك</Text>
          <EmpireCard style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Pressable onPress={recording ? stopRecording : startRecording} style={[styles.recBtn, recording && styles.recBtnActive]}>
              <MaterialCommunityIcons
                name={recording ? 'stop' : 'microphone'}
                size={40}
                color={recording ? colors.white : colors.black}
              />
            </Pressable>
            <Text style={styles.recHint}>
              {recording ? 'بسجّل… اضغط للإيقاف' : myUri ? 'تسجيل جاهز ✓ — اضغط لإعادة التسجيل' : 'اضغط للتسجيل'}
            </Text>

            {myUri && !recording && (
              <Animated.View entering={FadeIn} style={styles.playbackRow}>
                <Pressable style={styles.playMine} onPress={playMine}>
                  <MaterialCommunityIcons name="play" size={20} color={colors.gold} />
                  <Text style={styles.playMineText}>Play my voice · صوتي</Text>
                </Pressable>
              </Animated.View>
            )}
          </EmpireCard>

          {/* Step 3: AI assessment (or self-rate fallback) */}
          {myUri && !recording && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <Text style={styles.stepLabel}>3 · The verdict · التقييم</Text>

              {aiEnabled ? (
                <EmpireCard>
                  {assessing ? (
                    <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                      <ActivityIndicator color={colors.gold} size="large" />
                      <Text style={styles.rateHint}>الذكاء الاصطناعي بيسمع نطقك ويقيّمه… 🤖</Text>
                    </View>
                  ) : result ? (
                    <View style={{ alignItems: 'center' }}>
                      <Text
                        style={[
                          styles.scoreNum,
                          { color: result.passed ? colors.success : result.score >= 60 ? colors.gold : colors.danger },
                        ]}
                      >
                        {result.score}
                        <Text style={styles.scoreSlash}>/100</Text>
                      </Text>
                      <View style={[styles.verdictPill, result.passed && styles.verdictPass]}>
                        <MaterialCommunityIcons
                          name={result.passed ? 'check-decagram' : 'alert-circle-outline'}
                          size={16}
                          color={result.passed ? colors.success : colors.gold}
                        />
                        <Text style={[styles.verdictText, result.passed && { color: colors.success }]}>
                          {result.passed ? 'نطق مظبوط!' : 'محتاج شغل بسيط'}
                        </Text>
                      </View>
                      <Text style={styles.feedback}>{result.feedback}</Text>
                      <GoldButton
                        label="Try again · حاول تاني"
                        icon="microphone"
                        variant="outline"
                        onPress={startRecording}
                        style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
                      />
                      <GoldButton
                        label="Done · تمام"
                        icon="check"
                        onPress={() => router.back()}
                        style={{ marginTop: spacing.sm, alignSelf: 'stretch' }}
                      />
                    </View>
                  ) : (
                    <Text style={styles.rateHint}>اضغط التسجيل عشان الـ AI يقيّمك.</Text>
                  )}
                </EmpireCard>
              ) : (
                <EmpireCard>
                  <Text style={styles.rateHint}>
                    قيّم نفسك — أو فعّل تقييم الذكاء الاصطناعي من الإعدادات (مفتاح OpenAI) عشان يقيّمك بدقة 👑
                  </Text>
                  <View style={styles.starsRow}>
                    {[
                      { n: 1, label: 'Keep trying\nكمّل' },
                      { n: 2, label: 'Getting there\nقربت' },
                      { n: 3, label: 'Spot on!\nمظبوط' },
                    ].map((opt) => (
                      <Pressable
                        key={opt.n}
                        disabled={rated}
                        style={[styles.starBox, rated && { opacity: 0.5 }]}
                        onPress={() => finish(opt.n)}
                      >
                        <View style={styles.starIcons}>
                          {Array.from({ length: opt.n }).map((_, i) => (
                            <MaterialCommunityIcons key={i} name="star" size={18} color={colors.goldBright} />
                          ))}
                        </View>
                        <Text style={styles.starLabel}>{opt.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </EmpireCard>
              )}
            </Animated.View>
          )}

          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      </SafeAreaView>
    </RoyalBackground>
  );
}

const styles = StyleSheet.create({
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  errText: { color: colors.textSecondary, writingDirection: 'rtl' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: colors.textSecondary, fontSize: typography.sizes.tiny, letterSpacing: 3, fontWeight: '700' },
  content: { padding: spacing.lg },
  intro: { color: colors.textSecondary, fontSize: typography.sizes.small, writingDirection: 'rtl', lineHeight: 22, marginBottom: spacing.lg },
  stepLabel: { color: colors.gold, fontSize: typography.sizes.small, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.lg },
  word: { fontFamily: typography.serif, fontSize: 36, color: colors.goldBright, fontWeight: '800' },
  ipa: { color: colors.gold, fontSize: typography.sizes.body, marginTop: 4 },
  recBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.goldBright,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.gold,
  },
  recBtnActive: { backgroundColor: colors.danger, borderColor: colors.danger },
  recHint: { color: colors.textSecondary, fontSize: typography.sizes.small, marginTop: spacing.md, writingDirection: 'rtl', textAlign: 'center' },
  playbackRow: { marginTop: spacing.lg },
  playMine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.goldFaint,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  playMineText: { color: colors.gold, fontSize: typography.sizes.small, fontWeight: '700' },
  rateHint: { color: colors.textMuted, fontSize: typography.sizes.small, writingDirection: 'rtl', textAlign: 'center', marginBottom: spacing.md },
  scoreNum: { fontFamily: typography.serif, fontSize: 56, fontWeight: '800' },
  scoreSlash: { fontSize: typography.sizes.h3, color: colors.textMuted, fontWeight: '700' },
  verdictPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.goldFaint,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  verdictPass: { borderColor: colors.success, backgroundColor: 'rgba(63,176,122,0.12)' },
  verdictText: { color: colors.gold, fontSize: typography.sizes.small, fontWeight: '800', writingDirection: 'rtl' },
  feedback: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    writingDirection: 'rtl',
    textAlign: 'center',
    lineHeight: 26,
    marginTop: spacing.md,
  },
  starsRow: { flexDirection: 'row', gap: spacing.sm },
  starBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.charcoal,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    paddingVertical: spacing.md,
    gap: 6,
  },
  starIcons: { flexDirection: 'row' },
  starLabel: { color: colors.textSecondary, fontSize: typography.sizes.tiny, textAlign: 'center', lineHeight: 14, writingDirection: 'rtl' },
});
