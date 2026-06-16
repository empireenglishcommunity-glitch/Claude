import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import RoyalBackground from '../src/components/RoyalBackground';
import { colors, radii, spacing, typography } from '../src/theme';
import { getBookmarks, toggleBookmark } from '../src/services/storage';
import { findOfflineWord } from '../src/data/dictionary';

export default function BookmarksScreen() {
  const router = useRouter();
  const [words, setWords] = useState<string[]>([]);

  const load = useCallback(() => {
    getBookmarks().then(setWords);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const remove = async (w: string) => {
    await toggleBookmark(w);
    load();
  };

  return (
    <RoyalBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={colors.gold} />
          </Pressable>
          <Text style={styles.topTitle}>BOOKMARKS · المحفوظات</Text>
          <View style={styles.iconBtn} />
        </View>

        {words.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="bookmark-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No bookmarks yet</Text>
            <Text style={styles.emptyAr}>
              افتح أي كلمة واضغط علامة الحفظ 🔖 فوق عشان تلاقيها هنا.
            </Text>
          </View>
        ) : (
          <FlatList
            data={words}
            keyExtractor={(w) => w}
            contentContainerStyle={{ padding: spacing.lg }}
            renderItem={({ item }) => {
              const entry = findOfflineWord(item);
              return (
                <Pressable
                  style={styles.row}
                  onPress={() => router.push({ pathname: '/word/[word]', params: { word: item } })}
                >
                  <MaterialCommunityIcons name="bookmark" size={20} color={colors.goldBright} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.word}>{item}</Text>
                    {entry ? <Text style={styles.ipa}>{entry.ipaUS}</Text> : null}
                  </View>
                  <Pressable onPress={() => remove(item)} hitSlop={10} style={styles.removeBtn}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textMuted} />
                  </Pressable>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gold} />
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </RoyalBackground>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: colors.textSecondary, fontSize: typography.sizes.tiny, letterSpacing: 2, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  emptyTitle: { color: colors.textPrimary, fontSize: typography.sizes.h3, fontWeight: '700' },
  emptyAr: { color: colors.textMuted, fontSize: typography.sizes.small, textAlign: 'center', writingDirection: 'rtl', lineHeight: 22 },
  row: {
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
  word: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: '700' },
  ipa: { color: colors.gold, fontSize: typography.sizes.small, marginTop: 2 },
  removeBtn: { padding: 4 },
});
