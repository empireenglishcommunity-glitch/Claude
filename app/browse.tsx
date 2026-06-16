import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import RoyalBackground from '../src/components/RoyalBackground';
import { colors, radii, spacing, typography } from '../src/theme';
import { OFFLINE_WORDS } from '../src/data/dictionary';

export default function BrowseScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...OFFLINE_WORDS].sort((a, b) => a.word.localeCompare(b.word));
    return q ? list.filter((w) => w.word.toLowerCase().includes(q)) : list;
  }, [query]);

  return (
    <RoyalBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={colors.gold} />
          </Pressable>
          <Text style={styles.topTitle}>EXPLORE · تصفّح القاموس</Text>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.gold} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Filter words…  فلترة"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <FlatList
          data={data}
          keyExtractor={(w) => w.word}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push({ pathname: '/word/[word]', params: { word: item.word } })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.word}>{item.word}</Text>
                <Text style={styles.ipa}>{item.ipaUS}</Text>
                <Text style={styles.ar} numberOfLines={1}>{item.arabic}</Text>
              </View>
              <View style={styles.pos}>
                <Text style={styles.posText}>{item.partOfSpeech}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gold} />
            </Pressable>
          )}
        />
      </SafeAreaView>
    </RoyalBackground>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: colors.textSecondary, fontSize: typography.sizes.tiny, letterSpacing: 2, fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.charcoal,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    paddingHorizontal: spacing.lg,
    height: 48,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.body, marginLeft: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.charcoal,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.12)',
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  word: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: '700' },
  ipa: { color: colors.gold, fontSize: typography.sizes.small, marginTop: 2 },
  ar: { color: colors.textMuted, fontSize: typography.sizes.small, marginTop: 2, writingDirection: 'rtl' },
  pos: { backgroundColor: colors.goldFaint, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 3 },
  posText: { color: colors.goldSoft, fontSize: typography.sizes.tiny, fontStyle: 'italic' },
});
