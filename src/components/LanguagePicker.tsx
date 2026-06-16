import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../theme';
import { LANGUAGES } from '../data/languages';
import { useSettings } from '../context/SettingsContext';

/** A compact chip that opens a modal to choose the translation language. */
export default function LanguagePicker() {
  const { language, setLanguageCode } = useSettings();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable style={styles.chip} onPress={() => setOpen(true)}>
        <Text style={styles.flag}>{language.flag}</Text>
        <Text style={styles.chipText}>{language.native}</Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color={colors.gold} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHead}>
              <MaterialCommunityIcons name="translate" size={20} color={colors.gold} />
              <Text style={styles.sheetTitle}>Translation language · لغة الترجمة</Text>
            </View>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(l) => l.code}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => {
                const active = item.code === language.code;
                return (
                  <Pressable
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => {
                      setLanguageCode(item.code);
                      setOpen(false);
                    }}
                  >
                    <Text style={styles.rowFlag}>{item.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowNative}>{item.native}</Text>
                      <Text style={styles.rowLabel}>{item.label}</Text>
                    </View>
                    {item.offline && (
                      <View style={styles.offlineTag}>
                        <Text style={styles.offlineText}>offline</Text>
                      </View>
                    )}
                    {active && <MaterialCommunityIcons name="check" size={20} color={colors.goldBright} />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.goldFaint,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  flag: { fontSize: 14 },
  chipText: { color: colors.goldSoft, fontSize: typography.sizes.small, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.obsidian,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sheetTitle: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  rowActive: { backgroundColor: colors.goldFaint },
  rowFlag: { fontSize: 22 },
  rowNative: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: '600' },
  rowLabel: { color: colors.textMuted, fontSize: typography.sizes.tiny },
  offlineTag: {
    backgroundColor: 'rgba(63,176,122,0.15)',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  offlineText: { color: colors.success, fontSize: typography.sizes.tiny },
});
