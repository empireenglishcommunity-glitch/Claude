import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import RoyalBackground from '../../src/components/RoyalBackground';
import BrandLogo from '../../src/components/BrandLogo';
import EmpireCard from '../../src/components/EmpireCard';
import OrnamentDivider from '../../src/components/OrnamentDivider';
import SpeakerButton from '../../src/components/SpeakerButton';
import { brand, colors, gradients, radii, spacing, typography } from '../../src/theme';
import { searchOfflineWords, wordOfTheDay } from '../../src/data/dictionary';
import { getHistory } from '../../src/services/storage';
import { useProgress } from '../../src/context/ProgressContext';
import { RankPill } from '../../src/components/RankBadge';

export default function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const wotd = wordOfTheDay();
  const { registerActivity, rank } = useProgress();

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setHistory);
      registerActivity();
    }, [registerActivity]),
  );

  const suggestions = query.trim() ? searchOfflineWords(query, 6) : [];

  const goToWord = (word: string) => {
    const w = word.trim();
    if (!w) return;
    Keyboard.dismiss();
    setQuery('');
    router.push({ pathname: '/word/[word]', params: { word: w } });
  };

  return (
    <RoyalBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <BrandLogo size={44} />
              <View style={{ marginLeft: spacing.sm }}>
                <Text style={styles.brand}>{brand.name.toUpperCase()}</Text>
                <Text style={styles.community}>ENGLISH COMMUNITY</Text>
              </View>
            </View>
            <Pressable style={styles.rankChip} onPress={() => router.push('/(tabs)/progress')}>
              <RankPill rank={rank.current} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={22} color={colors.gold} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search a word…  ابحث عن كلمة"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => goToWord(query)}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={10}>
                <MaterialCommunityIcons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <EmpireCard style={{ marginBottom: spacing.lg }} padded={false}>
              {suggestions.map((s, i) => (
                <Pressable
                  key={s.word}
                  onPress={() => goToWord(s.word)}
                  style={[styles.suggestRow, i > 0 && styles.suggestBorder]}
                >
                  <Text style={styles.suggestWord}>{s.word}</Text>
                  <Text style={styles.suggestIpa}>{s.ipaUS}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gold} />
                </Pressable>
              ))}
            </EmpireCard>
          )}

          {/* Word of the Day */}
          <Animated.View entering={FadeInDown.duration(500)}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Word of the Day</Text>
              <Text style={styles.sectionAr}>كلمة الإمبراطورية اليوم</Text>
            </View>
            <Pressable onPress={() => goToWord(wotd.word)}>
              <LinearGradient
                colors={[colors.surfaceRaised, colors.charcoal]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.wotdCard}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.wotdWord}>{wotd.word}</Text>
                  <Text style={styles.wotdIpa}>{wotd.ipaUS}</Text>
                  <Text style={styles.wotdDef} numberOfLines={2}>
                    {wotd.definition}
                  </Text>
                  <Text style={styles.wotdAr} numberOfLines={1}>
                    {wotd.arabic}
                  </Text>
                </View>
                <SpeakerButton text={wotd.word} size={56} />
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <OrnamentDivider icon="crown" />

          {/* Quick tiles */}
          <View style={styles.tilesRow}>
            <Tile
              title="Sentences"
              arabic="نطق الجُمل"
              icon="format-quote-close"
              gradient={gradients.amber}
              onPress={() => router.push('/(tabs)/sentence')}
            />
            <Tile
              title="Explore"
              arabic="تصفّح القاموس"
              icon="book-open-page-variant"
              gradient={gradients.purple}
              onPress={() => router.push('/browse')}
            />
          </View>
          <View style={styles.tilesRow}>
            <Tile
              title="Bookmarks"
              arabic="المحفوظات"
              icon="bookmark"
              gradient={gradients.crimson}
              onPress={() => router.push('/bookmarks')}
            />
            <Tile
              title="Practice"
              arabic="تدرّب على كلمة"
              icon="school"
              gradient={gradients.emerald}
              onPress={() => {
                const pool = searchOfflineWords('', 100);
                const pick = pool[Math.floor(Math.random() * pool.length)];
                if (pick) router.push({ pathname: '/learn/[word]', params: { word: pick.word } });
              }}
            />
          </View>

          {/* Recent history */}
          <View style={[styles.sectionHead, { marginTop: spacing.xl }]}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <Text style={styles.sectionAr}>آخر ما بحثت عنه</Text>
          </View>
          {history.length === 0 ? (
            <Text style={styles.emptyHint}>No history yet — search your first word 👑</Text>
          ) : (
            <FlatList
              horizontal
              data={history}
              keyExtractor={(w) => w}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
              renderItem={({ item }) => (
                <Pressable style={styles.chip} onPress={() => goToWord(item)}>
                  <Text style={styles.chipText}>{item}</Text>
                </Pressable>
              )}
            />
          )}

          <View style={styles.sponsorRow}>
            <MaterialCommunityIcons name="shield-crown" size={13} color={colors.textMuted} />
            <Text style={styles.sponsor}>{brand.sponsor}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </RoyalBackground>
  );
}

function Tile({
  title,
  arabic,
  icon,
  gradient,
  onPress,
}: {
  title: string;
  arabic: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  gradient: readonly [string, string, ...string[]];
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tileFill}>
        <MaterialCommunityIcons name={icon} size={28} color={colors.white} />
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileAr}>{arabic}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brand: {
    fontFamily: typography.serif,
    fontSize: 26,
    color: colors.goldBright,
    fontWeight: '800',
    letterSpacing: 4,
  },
  community: {
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 5,
    marginTop: -2,
  },
  crownChip: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.goldFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankChip: { borderRadius: radii.pill },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.charcoal,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    paddingHorizontal: spacing.lg,
    height: 54,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    marginLeft: spacing.sm,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
  },
  suggestBorder: { borderTopWidth: 1, borderTopColor: 'rgba(212,175,55,0.15)' },
  suggestWord: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: '700', flex: 1 },
  suggestIpa: { color: colors.gold, fontSize: typography.sizes.small, marginRight: spacing.sm },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.serif,
    fontSize: typography.sizes.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  sectionAr: { color: colors.textMuted, fontSize: typography.sizes.small, writingDirection: 'rtl' },
  wotdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    padding: spacing.lg,
    gap: spacing.md,
  },
  wotdWord: {
    fontFamily: typography.serif,
    fontSize: typography.sizes.title,
    color: colors.goldBright,
    fontWeight: '800',
  },
  wotdIpa: { color: colors.gold, fontSize: typography.sizes.small, marginTop: 2 },
  wotdDef: { color: colors.textSecondary, fontSize: typography.sizes.small, marginTop: spacing.sm },
  wotdAr: { color: colors.textMuted, fontSize: typography.sizes.small, marginTop: 4, writingDirection: 'rtl' },
  tilesRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  tile: { flex: 1, borderRadius: radii.lg, overflow: 'hidden' },
  tileFill: { padding: spacing.lg, minHeight: 96, justifyContent: 'space-between' },
  tileTitle: { color: colors.white, fontSize: typography.sizes.body, fontWeight: '800', marginTop: spacing.sm },
  tileAr: { color: 'rgba(255,255,255,0.85)', fontSize: typography.sizes.small, writingDirection: 'rtl' },
  emptyHint: { color: colors.textMuted, fontSize: typography.sizes.small, fontStyle: 'italic' },
  chip: {
    backgroundColor: colors.goldFaint,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipText: { color: colors.goldSoft, fontSize: typography.sizes.small, fontWeight: '600' },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xxl },
  sponsor: {
    color: colors.textMuted,
    fontSize: typography.sizes.tiny,
    letterSpacing: 2,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
  },
});
