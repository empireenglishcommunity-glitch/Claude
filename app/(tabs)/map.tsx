import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import RoyalBackground from '../../src/components/RoyalBackground';
import { brand, colors, radii, spacing, typography } from '../../src/theme';
import { useProgress } from '../../src/context/ProgressContext';
import { useSettings } from '../../src/context/SettingsContext';
import { getProvinceStatuses, ProvinceStatus } from '../../src/data/provinces';
import { generateRelatedWords, hasAiKey } from '../../src/services/ai';
import { getHistory } from '../../src/services/storage';

const AI_CACHE_KEY = 'empire.ai.conquest';

export default function MapScreen() {
  const router = useRouter();
  const { state, registerActivity } = useProgress();
  const { aiKey } = useSettings();
  const aiEnabled = hasAiKey(aiKey);

  const [aiSeed, setAiSeed] = useState<string>('');
  const [aiWords, setAiWords] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const loadAiConquest = useCallback(async () => {
    if (!hasAiKey(aiKey)) return;
    const hist = await getHistory();
    const seed = hist[0] || 'greetings';
    try {
      const cachedRaw = await AsyncStorage.getItem(AI_CACHE_KEY);
      const cached = cachedRaw ? (JSON.parse(cachedRaw) as { seed: string; words: string[] }) : null;
      if (cached && cached.seed === seed && cached.words?.length) {
        setAiSeed(seed);
        setAiWords(cached.words);
        return;
      }
    } catch {
      // ignore cache errors
    }
    setAiSeed(seed);
    setAiLoading(true);
    const words = await generateRelatedWords(seed, aiKey);
    setAiLoading(false);
    if (words && words.length) {
      setAiWords(words);
      AsyncStorage.setItem(AI_CACHE_KEY, JSON.stringify({ seed, words })).catch(() => {});
    }
  }, [aiKey]);

  useFocusEffect(
    useCallback(() => {
      registerActivity();
      loadAiConquest();
    }, [registerActivity, loadAiConquest]),
  );

  const statuses = getProvinceStatuses(state.learnedWords);
  const learned = new Set(state.learnedWords.map((w) => w.toLowerCase()));
  const clearedCount = statuses.filter((s) => s.cleared).length;
  const goWord = (w: string) => router.push({ pathname: '/word/[word]', params: { word: w } });

  return (
    <RoyalBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Conquest Map</Text>
          <Text style={styles.titleAr}>خريطة الفتوحات</Text>
          <Text style={styles.subtitle}>
            افتح أقاليم الإمبراطورية واحدًا تلو الآخر — أتقن كل كلمات الإقليم عشان تفتح اللي بعده.
          </Text>
          <View style={styles.progressPill}>
            <MaterialCommunityIcons name="flag-variant" size={16} color={colors.goldBright} />
            <Text style={styles.progressText}>
              {clearedCount} / {statuses.length} provinces conquered
            </Text>
          </View>

          {/* Smart AI province */}
          <AiConquest
            enabled={aiEnabled}
            loading={aiLoading}
            seed={aiSeed}
            words={aiWords}
            learned={learned}
            onWord={goWord}
            onOpenSettings={() => router.push('/settings')}
          />

          {statuses.map((status, i) => (
            <ProvinceCard
              key={status.province.id}
              status={status}
              index={i}
              isLast={i === statuses.length - 1}
              learned={learned}
              onWord={goWord}
            />
          ))}

          <View style={styles.sponsorRow}>
            <MaterialCommunityIcons name="shield-crown" size={13} color={colors.textMuted} />
            <Text style={styles.sponsor}>{brand.sponsor}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </RoyalBackground>
  );
}

function AiConquest({
  enabled,
  loading,
  seed,
  words,
  learned,
  onWord,
  onOpenSettings,
}: {
  enabled: boolean;
  loading: boolean;
  seed: string;
  words: string[];
  learned: Set<string>;
  onWord: (w: string) => void;
  onOpenSettings: () => void;
}) {
  if (!enabled) {
    return (
      <Pressable onPress={onOpenSettings}>
        <LinearGradient
          colors={[colors.surfaceRaised, colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiHintCard}
        >
          <MaterialCommunityIcons name="robot" size={22} color={colors.gold} />
          <Text style={styles.aiHintText}>
            فعّل الخريطة الذكية ✨ — حُط مفتاح OpenAI من الإعدادات، وهنطلّعلك كلمات على قد ما بتتعلم بلا نهاية.
          </Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(450)} style={styles.aiCard}>
      <LinearGradient
        colors={['#2A2010', '#1A1306']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.aiFill}
      >
        <View style={styles.aiHead}>
          <MaterialCommunityIcons name="robot" size={22} color={colors.goldBright} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>Recommended for you · مقترح ليك</Text>
            {seed ? <Text style={styles.aiSeed}>بناءً على بحثك عن: {seed}</Text> : null}
          </View>
          <MaterialCommunityIcons name="infinity" size={20} color={colors.gold} />
        </View>

        {loading ? (
          <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
            <ActivityIndicator color={colors.gold} />
            <Text style={styles.aiSeed}>بيجهّز كلمات جديدة ليك…</Text>
          </View>
        ) : words.length ? (
          <View style={styles.wordWrap}>
            {words.map((w) => {
              const done = learned.has(w);
              return (
                <Pressable
                  key={w}
                  onPress={() => onWord(w)}
                  style={[styles.wordChip, done && styles.wordChipDone]}
                >
                  <MaterialCommunityIcons
                    name={done ? 'check-decagram' : 'star-four-points'}
                    size={done ? 13 : 14}
                    color={done ? colors.goldBright : colors.gold}
                  />
                  <Text style={[styles.wordText, done && styles.wordTextDone]}>{w}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.aiSeed}>ابحث عن أي كلمة الأول، وارجع هنا تلاقي كلمات شبيهة.</Text>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

function ProvinceCard({
  status,
  index,
  isLast,
  learned,
  onWord,
}: {
  status: ProvinceStatus;
  index: number;
  isLast: boolean;
  learned: Set<string>;
  onWord: (word: string) => void;
}) {
  const { province, masteredCount, total, cleared, unlocked } = status;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(450)}>
      <View style={styles.timelineRow}>
        {/* Timeline rail */}
        <View style={styles.rail}>
          <View style={[styles.node, unlocked && styles.nodeUnlocked, cleared && styles.nodeCleared]}>
            <MaterialCommunityIcons
              name={cleared ? 'check' : unlocked ? province.icon : 'lock'}
              size={18}
              color={cleared ? colors.black : unlocked ? colors.goldBright : colors.textMuted}
            />
          </View>
          {!isLast && <View style={[styles.line, cleared && styles.lineCleared]} />}
        </View>

        {/* Province body */}
        <View style={[styles.card, !unlocked && styles.cardLocked]}>
          <LinearGradient
            colors={unlocked ? [colors.surfaceRaised, colors.surface] : [colors.charcoal, colors.obsidian]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardFill}
          >
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.provName, !unlocked && styles.dim]}>{province.name}</Text>
                <Text style={styles.provAr}>{province.nameAr}</Text>
              </View>
              {cleared ? (
                <View style={styles.clearedBadge}>
                  <Text style={styles.clearedText}>CLEARED</Text>
                </View>
              ) : (
                <Text style={[styles.count, !unlocked && styles.dim]}>
                  {masteredCount}/{total}
                </Text>
              )}
            </View>

            {unlocked ? (
              <>
                <Text style={styles.provDesc}>{province.description}</Text>
                <View style={styles.wordWrap}>
                  {province.words.map((w) => {
                    const done = learned.has(w);
                    return (
                      <Pressable
                        key={w}
                        onPress={() => onWord(w)}
                        style={[styles.wordChip, done && styles.wordChipDone]}
                      >
                        <MaterialCommunityIcons
                          name={done ? 'check-decagram' : 'circle-small'}
                          size={done ? 13 : 16}
                          color={done ? colors.goldBright : colors.textMuted}
                        />
                        <Text style={[styles.wordText, done && styles.wordTextDone]}>{w}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <Text style={styles.lockedHint}>
                🔒 افتح الإقليم السابق بالكامل عشان توصل هنا
              </Text>
            )}
          </LinearGradient>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  aiCard: { borderRadius: radii.lg, overflow: 'hidden', marginBottom: spacing.lg },
  aiFill: { padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.goldBright },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiTitle: { fontFamily: typography.serif, fontSize: typography.sizes.h3, color: colors.goldBright, fontWeight: '800' },
  aiSeed: { color: colors.textMuted, fontSize: typography.sizes.small, writingDirection: 'rtl', marginTop: 4 },
  aiHintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  aiHintText: { flex: 1, color: colors.textSecondary, fontSize: typography.sizes.small, writingDirection: 'rtl', lineHeight: 22 },
  title: { fontFamily: typography.serif, fontSize: typography.sizes.title, color: colors.goldBright, fontWeight: '800' },
  titleAr: { color: colors.textMuted, fontSize: typography.sizes.small, writingDirection: 'rtl' },
  subtitle: { color: colors.textSecondary, fontSize: typography.sizes.small, marginTop: spacing.sm, writingDirection: 'rtl', lineHeight: 22 },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.goldFaint,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  progressText: { color: colors.goldSoft, fontSize: typography.sizes.small, fontWeight: '700' },
  timelineRow: { flexDirection: 'row' },
  rail: { width: 44, alignItems: 'center' },
  node: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.charcoal,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeUnlocked: { borderColor: colors.goldBright, backgroundColor: colors.goldFaint },
  nodeCleared: { backgroundColor: colors.goldBright, borderColor: colors.goldBright },
  line: { flex: 1, width: 2, backgroundColor: colors.charcoal, marginVertical: 4 },
  lineCleared: { backgroundColor: colors.gold },
  card: { flex: 1, marginBottom: spacing.lg, borderRadius: radii.lg, overflow: 'hidden' },
  cardLocked: { opacity: 0.7 },
  cardFill: { padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.goldBorder },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  provName: { fontFamily: typography.serif, fontSize: typography.sizes.h3, color: colors.textPrimary, fontWeight: '800' },
  provAr: { color: colors.textSecondary, fontSize: typography.sizes.small, writingDirection: 'rtl', marginTop: 2 },
  dim: { color: colors.textMuted },
  count: { color: colors.gold, fontSize: typography.sizes.body, fontWeight: '800' },
  clearedBadge: { backgroundColor: colors.gold, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 3 },
  clearedText: { color: colors.black, fontSize: typography.sizes.tiny, fontWeight: '900', letterSpacing: 1 },
  provDesc: { color: colors.textMuted, fontSize: typography.sizes.small, marginTop: spacing.sm },
  wordWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.black,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  wordChipDone: { borderColor: colors.goldBorder, backgroundColor: colors.goldFaint },
  wordText: { color: colors.textSecondary, fontSize: typography.sizes.small },
  wordTextDone: { color: colors.goldSoft, fontWeight: '700' },
  lockedHint: { color: colors.textMuted, fontSize: typography.sizes.small, marginTop: spacing.sm, writingDirection: 'rtl' },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xxl },
  sponsor: { color: colors.textMuted, fontSize: typography.sizes.tiny, letterSpacing: 2, marginLeft: spacing.xs, textTransform: 'uppercase' },
});
