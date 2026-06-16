import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import RoyalBackground from '../../src/components/RoyalBackground';
import EmpireCard from '../../src/components/EmpireCard';
import RankBadge from '../../src/components/RankBadge';
import XPBar from '../../src/components/XPBar';
import StreakFlame from '../../src/components/StreakFlame';
import OrnamentDivider from '../../src/components/OrnamentDivider';
import { brand, colors, radii, spacing, typography } from '../../src/theme';
import { useProgress } from '../../src/context/ProgressContext';
import { RANKS } from '../../src/data/ranks';
import { BADGES, earnedBadges } from '../../src/data/badges';

export default function ProgressScreen() {
  const router = useRouter();
  const { state, rank, registerActivity } = useProgress();

  useFocusEffect(
    useCallback(() => {
      registerActivity();
    }, [registerActivity]),
  );

  return (
    <RoyalBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.screenTitle}>My Empire</Text>
              <Text style={styles.screenAr}>إمبراطوريتي</Text>
            </View>
            <Pressable style={styles.gearBtn} onPress={() => router.push('/settings')} hitSlop={10}>
              <MaterialCommunityIcons name="cog" size={22} color={colors.gold} />
            </Pressable>
          </View>

          {/* Rank hero */}
          <Animated.View entering={FadeInDown.duration(450)}>
            <EmpireCard style={{ alignItems: 'center', marginTop: spacing.lg }}>
              <RankBadge rank={rank.current} size={96} />
              <Text style={styles.rankTitle}>{rank.current.title}</Text>
              <Text style={styles.rankAr}>{rank.current.titleAr}</Text>
              <Text style={styles.xpTotal}>{state.xp} XP</Text>
              <View style={{ height: spacing.lg, alignSelf: 'stretch' }} />
              <View style={{ alignSelf: 'stretch' }}>
                <XPBar rank={rank} />
              </View>
            </EmpireCard>
          </Animated.View>

          {/* Streak + stats */}
          <View style={styles.statsRow}>
            <StreakFlame streak={state.streak} />
            <View style={styles.statBox}>
              <MaterialCommunityIcons name="book-search" size={22} color={colors.gold} />
              <Text style={styles.statNum}>{state.viewedWords.length}</Text>
              <Text style={styles.statLabel}>discovered{'\n'}اكتشفت</Text>
            </View>
            <View style={styles.statBox}>
              <MaterialCommunityIcons name="check-decagram" size={22} color={colors.gold} />
              <Text style={styles.statNum}>{state.learnedWords.length}</Text>
              <Text style={styles.statLabel}>mastered{'\n'}أتقنت</Text>
            </View>
          </View>

          <OrnamentDivider icon="crown" />

          {/* Achievements */}
          <Text style={styles.sectionTitle}>Achievements · الأوسمة</Text>
          <BadgesGrid earned={earnedBadges(state)} />

          <OrnamentDivider icon="trophy-variant" />

          {/* Community leaderboard */}
          <Text style={styles.sectionTitle}>Community · ترتيب المجتمع</Text>
          <Leaderboard userXp={state.xp} />

          <OrnamentDivider icon="chess-rook" />

          {/* Rank ladder */}
          <Text style={styles.sectionTitle}>The Path · مسار الترقّي</Text>
          {RANKS.map((r) => {
            const reached = state.xp >= r.minXp;
            const isCurrent = r.id === rank.current.id;
            return (
              <View key={r.id} style={[styles.ladderRow, isCurrent && styles.ladderCurrent]}>
                <MaterialCommunityIcons
                  name={r.icon}
                  size={24}
                  color={reached ? colors.goldBright : colors.textMuted}
                />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={[styles.ladderTitle, !reached && { color: colors.textMuted }]}>
                    {r.title} · {r.titleAr}
                  </Text>
                  <Text style={styles.ladderXp}>{r.minXp} XP</Text>
                </View>
                {isCurrent && <Text style={styles.youBadge}>YOU</Text>}
                {reached && !isCurrent && (
                  <MaterialCommunityIcons name="check" size={18} color={colors.success} />
                )}
              </View>
            );
          })}

          {/* Mastered words */}
          {state.learnedWords.length > 0 && (
            <>
              <OrnamentDivider icon="trophy-variant" />
              <Text style={styles.sectionTitle}>Mastered Words · كلمات أتقنتها</Text>
              <View style={styles.chipsWrap}>
                {state.learnedWords.map((w) => (
                  <Pressable
                    key={w}
                    style={styles.chip}
                    onPress={() => router.push({ pathname: '/word/[word]', params: { word: w } })}
                  >
                    <MaterialCommunityIcons name="check-decagram" size={14} color={colors.goldBright} />
                    <Text style={styles.chipText}>{w}</Text>
                  </Pressable>
                ))}
              </View>
            </>
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

const FICTIONAL_MEMBERS: { name: string; xp: number }[] = [
  { name: 'Cleopatra', xp: 1280 },
  { name: 'Caesar', xp: 940 },
  { name: 'Saladin', xp: 760 },
  { name: 'Khalid', xp: 540 },
  { name: 'Zenobia', xp: 410 },
  { name: 'Hannibal', xp: 300 },
  { name: 'Nefertiti', xp: 180 },
  { name: 'Tariq', xp: 90 },
];

function Leaderboard({ userXp }: { userXp: number }) {
  const rows = [...FICTIONAL_MEMBERS, { name: 'You · أنت', xp: userXp, isUser: true }]
    .map((m) => ({ ...m, isUser: 'isUser' in m ? (m as { isUser?: boolean }).isUser : false }))
    .sort((a, b) => b.xp - a.xp);

  const medal = (i: number) =>
    i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;

  return (
    <View>
      {rows.map((m, i) => (
        <View key={m.name} style={[styles.lbRow, m.isUser && styles.lbRowUser]}>
          <Text style={styles.lbRank}>{medal(i)}</Text>
          <Text style={[styles.lbName, m.isUser && styles.lbNameUser]} numberOfLines={1}>
            {m.name}
          </Text>
          <Text style={styles.lbXp}>{m.xp} XP</Text>
        </View>
      ))}
      <Text style={styles.lbNote}>ترتيب تجريبي للمجتمع — هيتفعّل أونلاين قريبًا.</Text>
    </View>
  );
}

function BadgesGrid({ earned }: { earned: Set<string> }) {
  return (
    <View style={styles.badgesGrid}>
      {BADGES.map((b) => {
        const unlocked = earned.has(b.id);
        return (
          <View key={b.id} style={[styles.badge, !unlocked && styles.badgeLocked]}>
            <MaterialCommunityIcons
              name={unlocked ? b.icon : 'lock'}
              size={26}
              color={unlocked ? colors.goldBright : colors.textMuted}
            />
            <Text style={[styles.badgeTitle, !unlocked && { color: colors.textMuted }]} numberOfLines={1}>
              {b.title}
            </Text>
            <Text style={styles.badgeAr} numberOfLines={1}>
              {b.titleAr}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  gearBtn: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.goldFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.charcoal,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.12)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  lbRowUser: { borderColor: colors.goldBright, backgroundColor: colors.goldFaint },
  lbRank: { color: colors.goldSoft, fontSize: typography.sizes.body, fontWeight: '800', width: 28 },
  lbName: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.body },
  lbNameUser: { color: colors.goldBright, fontWeight: '800' },
  lbXp: { color: colors.gold, fontSize: typography.sizes.small, fontWeight: '700' },
  lbNote: { color: colors.textMuted, fontSize: typography.sizes.tiny, writingDirection: 'rtl', textAlign: 'center', marginTop: 4 },
  screenTitle: { fontFamily: typography.serif, fontSize: typography.sizes.title, color: colors.goldBright, fontWeight: '800' },
  screenAr: { color: colors.textMuted, fontSize: typography.sizes.small, writingDirection: 'rtl' },
  rankTitle: { fontFamily: typography.serif, fontSize: typography.sizes.title, color: colors.goldBright, fontWeight: '800', marginTop: spacing.md },
  rankAr: { color: colors.textSecondary, fontSize: typography.sizes.body, writingDirection: 'rtl' },
  xpTotal: { color: colors.gold, fontSize: typography.sizes.h3, fontWeight: '700', marginTop: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.charcoal,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.15)',
    paddingVertical: spacing.md,
    gap: 2,
  },
  statNum: { color: colors.textPrimary, fontSize: typography.sizes.h2, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: typography.sizes.tiny, textAlign: 'center', lineHeight: 14 },
  sectionTitle: { fontFamily: typography.serif, fontSize: typography.sizes.h3, color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.md },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  badge: {
    width: '31%',
    alignItems: 'center',
    backgroundColor: colors.charcoal,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    paddingVertical: spacing.md,
    gap: 4,
  },
  badgeLocked: { borderColor: 'rgba(212,175,55,0.12)', opacity: 0.6 },
  badgeTitle: { color: colors.goldSoft, fontSize: typography.sizes.tiny, fontWeight: '800' },
  badgeAr: { color: colors.textMuted, fontSize: 10, writingDirection: 'rtl' },
  ladderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.charcoal,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.12)',
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  ladderCurrent: { borderColor: colors.goldBright, backgroundColor: colors.goldFaint },
  ladderTitle: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: '700' },
  ladderXp: { color: colors.textMuted, fontSize: typography.sizes.tiny, marginTop: 2 },
  youBadge: {
    color: colors.black,
    backgroundColor: colors.gold,
    fontSize: typography.sizes.tiny,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.goldFaint,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: { color: colors.goldSoft, fontSize: typography.sizes.small, fontWeight: '600' },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xxl },
  sponsor: { color: colors.textMuted, fontSize: typography.sizes.tiny, letterSpacing: 2, marginLeft: spacing.xs, textTransform: 'uppercase' },
});
