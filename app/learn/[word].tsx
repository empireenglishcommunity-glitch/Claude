import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import RoyalBackground from '../../src/components/RoyalBackground';
import EmpireCard from '../../src/components/EmpireCard';
import GoldButton from '../../src/components/GoldButton';
import SpeakerButton from '../../src/components/SpeakerButton';
import { colors, radii, spacing, typography } from '../../src/theme';
import { WordEntry } from '../../src/data/types';
import { lookupWord } from '../../src/services/dictionary';
import { speakAmerican } from '../../src/services/speech';
import { OFFLINE_WORDS } from '../../src/data/dictionary';
import { useProgress } from '../../src/context/ProgressContext';

type Step = 'listen' | 'syllables' | 'meaning' | 'quiz' | 'done';
const ORDER: Step[] = ['listen', 'syllables', 'meaning', 'quiz', 'done'];

export default function LearnScreen() {
  const router = useRouter();
  const { completeLesson } = useProgress();
  const params = useLocalSearchParams<{ word: string }>();
  const word = String(params.word ?? '').trim();

  const [entry, setEntry] = useState<WordEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('listen');

  useEffect(() => {
    let active = true;
    lookupWord(word).then((res) => {
      if (!active) return;
      setEntry(res.status === 'found' ? res.entry : null);
      setLoading(false);
      if (res.status === 'found') speakAmerican(res.entry.word);
    });
    return () => {
      active = false;
    };
  }, [word]);

  const stepIndex = ORDER.indexOf(step);
  const goNext = () => setStep(ORDER[Math.min(stepIndex + 1, ORDER.length - 1)]);

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
          <Text style={styles.errText}>"{word}" غير متاح للتعلّم الآن.</Text>
          <GoldButton label="Back · رجوع" icon="chevron-left" onPress={() => router.back()} />
        </SafeAreaView>
      </RoyalBackground>
    );
  }

  return (
    <RoyalBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header + progress dots */}
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={24} color={colors.gold} />
          </Pressable>
          <View style={styles.dots}>
            {ORDER.slice(0, 4).map((s, i) => (
              <View key={s} style={[styles.dot, i <= stepIndex && styles.dotActive]} />
            ))}
          </View>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {step === 'listen' && <ListenStep key="listen" entry={entry} onNext={goNext} />}
          {step === 'syllables' && <SyllablesStep key="syll" entry={entry} onNext={goNext} />}
          {step === 'meaning' && <MeaningStep key="mean" entry={entry} onNext={goNext} />}
          {step === 'quiz' && (
            <QuizStep
              key="quiz"
              entry={entry}
              onPass={() => {
                completeLesson(entry.word);
                goNext();
              }}
            />
          )}
          {step === 'done' && <DoneStep key="done" entry={entry} onClose={() => router.back()} />}
        </ScrollView>
      </SafeAreaView>
    </RoyalBackground>
  );
}

function StepHeader({ icon, title, arabic }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; arabic: string }) {
  return (
    <View style={styles.stepHead}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.gold} />
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepAr}>{arabic}</Text>
    </View>
  );
}

function ListenStep({ entry, onNext }: { entry: WordEntry; onNext: () => void }) {
  return (
    <Animated.View entering={FadeInRight.duration(350)}>
      <StepHeader icon="ear-hearing" title="Listen" arabic="استمع" />
      <EmpireCard style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
        <Text style={styles.bigWord}>{entry.word}</Text>
        <Text style={styles.ipa}>{entry.ipaUS}</Text>
        <View style={{ height: spacing.lg }} />
        <SpeakerButton text={entry.word} size={84} />
        <Text style={styles.hint}>اسمع الكلمة كذا مرة وقلّدها بصوتك 🎙️</Text>
      </EmpireCard>
      <GoldButton label="Got it · فهمت" icon="arrow-right" onPress={onNext} style={{ marginTop: spacing.xl }} />
    </Animated.View>
  );
}

function SyllablesStep({ entry, onNext }: { entry: WordEntry; onNext: () => void }) {
  return (
    <Animated.View entering={FadeInRight.duration(350)}>
      <StepHeader icon="music-note" title="Syllables" arabic="المقاطع" />
      <EmpireCard>
        <View style={styles.syllRow}>
          {entry.syllables.map((s, i) => (
            <Pressable
              key={`${s.text}-${i}`}
              onPress={() => speakAmerican(s.text, { rate: 'slow' })}
              style={[styles.syllChip, s.stressed && styles.syllStressed]}
            >
              {s.stressed && <MaterialCommunityIcons name="circle" size={6} color={colors.goldBright} />}
              <Text style={[styles.syllText, s.stressed && styles.syllTextStressed]}>{s.text}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>اضغط كل مقطع بالترتيب واسمعه، وركّز على المقطع المضغوط (الذهبي).</Text>
      </EmpireCard>
      <GoldButton label="Next · التالي" icon="arrow-right" onPress={onNext} style={{ marginTop: spacing.xl }} />
    </Animated.View>
  );
}

function MeaningStep({ entry, onNext }: { entry: WordEntry; onNext: () => void }) {
  return (
    <Animated.View entering={FadeInRight.duration(350)}>
      <StepHeader icon="book-open-variant" title="Meaning" arabic="المعنى" />
      <EmpireCard>
        <Text style={styles.definition}>{entry.definition}</Text>
        <View style={styles.divider} />
        <Text style={styles.arabic}>{entry.arabic}</Text>
        {entry.example ? (
          <>
            <View style={styles.divider} />
            <View style={styles.exampleRow}>
              <Text style={styles.example}>“{entry.example}”</Text>
              <SpeakerButton text={entry.example} size={40} />
            </View>
          </>
        ) : null}
      </EmpireCard>
      <GoldButton label="Quiz me · اختبرني" icon="help-circle" onPress={onNext} style={{ marginTop: spacing.xl }} />
    </Animated.View>
  );
}

function QuizStep({ entry, onPass }: { entry: WordEntry; onPass: () => void }) {
  const options = useMemo(() => buildOptions(entry), [entry]);
  const [picked, setPicked] = useState<string | null>(null);
  const correct = entry.arabic;

  const choose = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    if (opt === correct) setTimeout(onPass, 900);
  };

  return (
    <Animated.View entering={FadeInRight.duration(350)}>
      <StepHeader icon="help-circle" title="Quick Quiz" arabic="اختبار سريع" />
      <Text style={styles.quizQuestion}>
        إيه المعنى الصحيح لكلمة <Text style={styles.quizWord}>{entry.word}</Text>؟
      </Text>
      {options.map((opt) => {
        const isPicked = picked === opt;
        const isCorrect = opt === correct;
        const showState = picked !== null && (isPicked || isCorrect);
        return (
          <Pressable
            key={opt}
            onPress={() => choose(opt)}
            style={[
              styles.option,
              showState && isCorrect && styles.optionCorrect,
              isPicked && !isCorrect && styles.optionWrong,
            ]}
          >
            <Text style={styles.optionText}>{opt}</Text>
            {showState && isCorrect && (
              <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
            )}
            {isPicked && !isCorrect && (
              <MaterialCommunityIcons name="close-circle" size={20} color={colors.danger} />
            )}
          </Pressable>
        );
      })}
      {picked && picked !== correct && (
        <Pressable onPress={() => setPicked(null)} style={styles.retry}>
          <MaterialCommunityIcons name="refresh" size={16} color={colors.gold} />
          <Text style={styles.retryText}>Try again · جرّب تاني</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

function DoneStep({ entry, onClose }: { entry: WordEntry; onClose: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: 'center', paddingTop: spacing.xxl }}>
      <MaterialCommunityIcons name="trophy-variant" size={96} color={colors.goldBright} />
      <Text style={styles.doneTitle}>Mastered!</Text>
      <Text style={styles.doneAr}>أتقنت كلمة “{entry.word}” 👑</Text>
      <Text style={styles.doneXp}>+20 XP</Text>
      <GoldButton label="Continue · أكمل" icon="check" onPress={onClose} style={{ marginTop: spacing.xxl, alignSelf: 'stretch' }} />
    </Animated.View>
  );
}

/** Build 1 correct + 3 distractor Arabic meanings for the quiz. */
function buildOptions(entry: WordEntry): string[] {
  const distractors = OFFLINE_WORDS.filter((w) => w.word !== entry.word)
    .map((w) => w.arabic)
    .filter((a) => a && a !== entry.arabic);
  // shuffle distractors
  for (let i = distractors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
  }
  const opts = [entry.arabic, ...distractors.slice(0, 3)];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

const styles = StyleSheet.create({
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  errText: { color: colors.textSecondary, writingDirection: 'rtl' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 28, height: 4, borderRadius: 2, backgroundColor: colors.charcoal },
  dotActive: { backgroundColor: colors.gold },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  stepTitle: { fontFamily: typography.serif, fontSize: typography.sizes.h2, color: colors.textPrimary, fontWeight: '700' },
  stepAr: { color: colors.textMuted, fontSize: typography.sizes.small, writingDirection: 'rtl' },
  bigWord: { fontFamily: typography.serif, fontSize: 44, color: colors.goldBright, fontWeight: '800' },
  ipa: { color: colors.gold, fontSize: typography.sizes.body, marginTop: 4 },
  hint: { color: colors.textMuted, fontSize: typography.sizes.small, textAlign: 'center', marginTop: spacing.lg, writingDirection: 'rtl', lineHeight: 22 },
  syllRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  syllChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.black, borderRadius: radii.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: 'rgba(212,175,55,0.15)' },
  syllStressed: { borderColor: colors.goldBright, backgroundColor: colors.goldFaint },
  syllText: { color: colors.textSecondary, fontSize: typography.sizes.h3, fontWeight: '600' },
  syllTextStressed: { color: colors.goldBright, fontWeight: '800' },
  definition: { color: colors.textPrimary, fontSize: typography.sizes.body, lineHeight: 24 },
  arabic: { color: colors.textSecondary, fontSize: typography.sizes.body, lineHeight: 26, writingDirection: 'rtl' },
  divider: { height: 1, backgroundColor: colors.goldBorder, marginVertical: spacing.md },
  exampleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  example: { flex: 1, color: colors.textPrimary, fontStyle: 'italic', fontSize: typography.sizes.body, lineHeight: 24 },
  quizQuestion: { color: colors.textPrimary, fontSize: typography.sizes.h3, marginBottom: spacing.lg, writingDirection: 'rtl', lineHeight: 28 },
  quizWord: { color: colors.goldBright, fontWeight: '800' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, backgroundColor: colors.charcoal, borderRadius: radii.md, borderWidth: 1, borderColor: colors.goldBorder, padding: spacing.lg, marginBottom: spacing.md },
  optionCorrect: { borderColor: colors.success, backgroundColor: 'rgba(63,176,122,0.12)' },
  optionWrong: { borderColor: colors.danger, backgroundColor: 'rgba(192,57,43,0.12)' },
  optionText: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.body, writingDirection: 'rtl', lineHeight: 24 },
  retry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  retryText: { color: colors.gold, fontSize: typography.sizes.small, fontWeight: '700' },
  doneTitle: { fontFamily: typography.serif, fontSize: typography.sizes.hero, color: colors.goldBright, fontWeight: '800', marginTop: spacing.lg },
  doneAr: { color: colors.textSecondary, fontSize: typography.sizes.body, marginTop: spacing.sm, writingDirection: 'rtl' },
  doneXp: { color: colors.gold, fontSize: typography.sizes.h2, fontWeight: '800', marginTop: spacing.md },
});
