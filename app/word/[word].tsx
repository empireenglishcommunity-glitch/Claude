import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import RoyalBackground from '../../src/components/RoyalBackground';
import EmpireCard from '../../src/components/EmpireCard';
import SectionLabel from '../../src/components/SectionLabel';
import OrnamentDivider from '../../src/components/OrnamentDivider';
import SpeakerButton from '../../src/components/SpeakerButton';
import GoldButton from '../../src/components/GoldButton';
import LanguagePicker from '../../src/components/LanguagePicker';
import { colors, gradients, radii, spacing, typography } from '../../src/theme';
import { WordEntry } from '../../src/data/types';
import { lookupWord } from '../../src/services/dictionary';
import { speakAmerican } from '../../src/services/speech';
import { translateOnline } from '../../src/services/translation';
import { getNote, isBookmarked, recordHistory, setNote, toggleBookmark } from '../../src/services/storage';
import { useProgress } from '../../src/context/ProgressContext';
import { useSettings } from '../../src/context/SettingsContext';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; entry: WordEntry }
  | { kind: 'error' };

export default function WordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ word: string }>();
  const word = String(params.word ?? '').trim();

  const [state, setState] = useState<State>({ kind: 'loading' });
  const [marked, setMarked] = useState(false);
  const { discoverWord, registerActivity } = useProgress();

  useEffect(() => {
    let active = true;
    setState({ kind: 'loading' });
    lookupWord(word).then((res) => {
      if (!active) return;
      if (res.status === 'found') {
        setState({ kind: 'ready', entry: res.entry });
        recordHistory(res.entry.word);
        registerActivity();
        discoverWord(res.entry.word);
      } else {
        setState({ kind: 'error' });
      }
    });
    isBookmarked(word).then(setMarked);
    return () => {
      active = false;
    };
  }, [word, discoverWord, registerActivity]);

  const onToggleBookmark = async () => {
    const added = await toggleBookmark(state.kind === 'ready' ? state.entry.word : word);
    setMarked(added);
  };

  return (
    <RoyalBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Top bar */}
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={colors.gold} />
          </Pressable>
          <Text style={styles.topTitle}>EMPIRE DICTIONARY</Text>
          <Pressable onPress={onToggleBookmark} hitSlop={12} style={styles.iconBtn}>
            <MaterialCommunityIcons
              name={marked ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={colors.gold}
            />
          </Pressable>
        </View>

        {state.kind === 'loading' && (
          <View style={styles.centerFill}>
            <ActivityIndicator color={colors.gold} size="large" />
            <Text style={styles.loadingText}>Summoning the word…</Text>
          </View>
        )}

        {state.kind === 'error' && (
          <View style={styles.centerFill}>
            <MaterialCommunityIcons name="cloud-off-outline" size={56} color={colors.textMuted} />
            <Text style={styles.errorTitle}>"{word}" not found</Text>
            <Text style={styles.errorSub}>
              مش موجودة في القاموس الأوفلاين، وفشل الاتصال بالإنترنت. جرّب كلمة تانية أو اتأكد من النت.
            </Text>
          </View>
        )}

        {state.kind === 'ready' && <WordContent entry={state.entry} />}
      </SafeAreaView>
    </RoyalBackground>
  );
}

function WordContent({ entry }: { entry: WordEntry }) {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Hero: word + pronounce */}
      <Animated.View entering={FadeInDown.duration(450)}>
        <LinearGradient colors={gradients.hero} style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.posBadge}>
              <Text style={styles.posText}>{entry.partOfSpeech}</Text>
            </View>
            {entry.source === 'online' ? (
              <View style={styles.srcBadge}>
                <MaterialCommunityIcons name="wifi" size={12} color={colors.textMuted} />
                <Text style={styles.srcText}>online</Text>
              </View>
            ) : (
              <View style={styles.srcBadge}>
                <MaterialCommunityIcons name="shield-check" size={12} color={colors.success} />
                <Text style={[styles.srcText, { color: colors.success }]}>offline</Text>
              </View>
            )}
          </View>

          <Text style={styles.word}>{entry.word}</Text>

          <View style={styles.ipaRow}>
            <View style={styles.ipaChip}>
              <Text style={styles.ipaFlag}>🇺🇸</Text>
              <Text style={styles.ipa}>{entry.ipaUS}</Text>
            </View>
            {entry.ipaUK ? (
              <View style={styles.ipaChip}>
                <Text style={styles.ipaFlag}>🇬🇧</Text>
                <Text style={styles.ipa}>{entry.ipaUK}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.pronounceRow}>
            <SpeakerButton text={entry.word} size={64} />
            <View style={styles.pronounceText}>
              <Text style={styles.pronounceTitle}>American Accent</Text>
              <Text style={styles.pronounceSub}>اضغط للنطق بلهجة أمريكية</Text>
              <Pressable style={styles.slowBtn} onPress={() => speakAmerican(entry.word, { rate: 'slow' })}>
                <MaterialCommunityIcons name="turtle" size={16} color={colors.gold} />
                <Text style={styles.slowText}>Slow  ·  بطيء</Text>
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Learn CTA */}
      <Animated.View entering={FadeIn.delay(100).duration(450)} style={styles.block}>
        <GoldButton
          label="Learn this word  ·  اتعلم الكلمة دي"
          icon="school"
          onPress={() => router.push({ pathname: '/learn/[word]', params: { word: entry.word } })}
        />
      </Animated.View>
      <Animated.View entering={FadeIn.delay(150).duration(450)} style={styles.block}>
        <SectionLabel title="Syllables" icon="music-note" arabic="المقاطع الصوتية" />
        <EmpireCard>
          <View style={styles.syllRow}>
            {entry.syllables.map((s, i) => (
              <React.Fragment key={`${s.text}-${i}`}>
                <Pressable
                  onPress={() => speakAmerican(s.text, { rate: 'slow' })}
                  style={[styles.syllChip, s.stressed && styles.syllStressed]}
                >
                  {s.stressed && (
                    <MaterialCommunityIcons
                      name="circle"
                      size={6}
                      color={colors.goldBright}
                      style={{ marginBottom: 2 }}
                    />
                  )}
                  <Text style={[styles.syllText, s.stressed && styles.syllTextStressed]}>{s.text}</Text>
                </Pressable>
                {i < entry.syllables.length - 1 && <Text style={styles.syllDot}>·</Text>}
              </React.Fragment>
            ))}
          </View>
          <Text style={styles.syllHint}>
            النقطة الذهبية = المقطع المضغوط (stress). اضغط أي مقطع لتسمعه وحده.
          </Text>
        </EmpireCard>
      </Animated.View>

      {/* Meaning */}
      <Animated.View entering={FadeIn.delay(250).duration(450)} style={styles.block}>
        <View style={styles.meaningHead}>
          <SectionLabel title="Meaning" icon="book-open-variant" arabic="المعنى" />
          <LanguagePicker />
        </View>
        <EmpireCard>
          <Text style={styles.definition}>{entry.definition}</Text>
          <OrnamentDivider icon="translate" />
          <MeaningTranslation entry={entry} />
        </EmpireCard>
      </Animated.View>

      {/* Example */}
      {entry.example ? (
        <Animated.View entering={FadeIn.delay(350).duration(450)} style={styles.block}>
          <SectionLabel title="In a sentence" icon="format-quote-close" arabic="في جملة" />
          <EmpireCard>
            <View style={styles.exampleRow}>
              <Text style={styles.example}>“{entry.example}”</Text>
              <SpeakerButton text={entry.example} size={44} />
            </View>
            {entry.exampleArabic ? <Text style={styles.exampleAr}>{entry.exampleArabic}</Text> : null}
          </EmpireCard>
        </Animated.View>
      ) : null}

      {/* Synonyms */}
      {entry.synonyms && entry.synonyms.length > 0 ? (
        <Animated.View entering={FadeIn.delay(450).duration(450)} style={styles.block}>
          <SectionLabel title="Synonyms" icon="vector-link" arabic="مرادفات" />
          <View style={styles.synRow}>
            {entry.synonyms.map((syn) => (
              <View key={syn} style={styles.synChip}>
                <Text style={styles.synText}>{syn}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      ) : null}

      {/* Notes */}
      <Animated.View entering={FadeIn.delay(500).duration(450)} style={styles.block}>
        <SectionLabel title="My notes" icon="pencil" arabic="ملاحظاتي" />
        <NotesEditor word={entry.word} />
      </Animated.View>

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
}

function MeaningTranslation({ entry }: { entry: WordEntry }) {
  const { language } = useSettings();
  const isArabic = language.code === 'ar';
  const [text, setText] = useState<string | null>(isArabic ? entry.arabic : null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (language.code === 'ar') {
      setText(entry.arabic);
      setFailed(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    setText(null);
    // Translate the English definition into the chosen language (meaning-focused).
    translateOnline(entry.definition, language.code).then((res) => {
      if (!active) return;
      if (res) setText(res);
      else setFailed(true);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [language.code, entry]);

  if (loading) {
    return (
      <View style={styles.translateLoading}>
        <ActivityIndicator color={colors.gold} />
        <Text style={styles.translateHint}>Translating to {language.label}…</Text>
      </View>
    );
  }

  if (failed) {
    return (
      <Text style={styles.translateFail}>
        تعذّر جلب الترجمة لـ {language.native}. الترجمة لغير العربية تحتاج اتصالًا بالإنترنت.
      </Text>
    );
  }

  return (
    <Text style={[styles.arabic, !language.rtl && styles.ltrMeaning]}>{text}</Text>
  );
}

function NotesEditor({ word }: { word: string }) {
  const [note, setNoteText] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getNote(word).then(setNoteText);
  }, [word]);

  const save = (text: string) => {
    setNoteText(text);
    setNote(word, text);
    setSaved(true);
  };

  return (
    <EmpireCard>
      <TextInput
        value={note}
        onChangeText={save}
        placeholder="Write a note to remember this word…  اكتب ملاحظة"
        placeholderTextColor={colors.textMuted}
        style={styles.noteInput}
        multiline
      />
      {saved && (
        <View style={styles.savedRow}>
          <MaterialCommunityIcons name="content-save-check" size={14} color={colors.success} />
          <Text style={styles.savedText}>Saved · اتحفظت</Text>
        </View>
      )}
    </EmpireCard>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  topTitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.tiny,
    letterSpacing: 3,
    fontWeight: '700',
  },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { color: colors.textMuted, marginTop: spacing.md },
  errorTitle: { color: colors.textPrimary, fontSize: typography.sizes.h3, fontWeight: '700', marginTop: spacing.md },
  errorSub: {
    color: colors.textMuted,
    fontSize: typography.sizes.small,
    textAlign: 'center',
    marginTop: spacing.sm,
    writingDirection: 'rtl',
    lineHeight: 22,
  },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  hero: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    padding: spacing.xl,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  posBadge: {
    backgroundColor: colors.goldFaint,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  posText: { color: colors.goldSoft, fontSize: typography.sizes.tiny, fontStyle: 'italic' },
  srcBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  srcText: { color: colors.textMuted, fontSize: typography.sizes.tiny, textTransform: 'uppercase', letterSpacing: 1 },
  word: {
    fontFamily: typography.serif,
    fontSize: typography.sizes.hero,
    color: colors.goldBright,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  ipaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  ipaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.black,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  ipaFlag: { fontSize: 14 },
  ipa: { color: colors.textPrimary, fontSize: typography.sizes.small, letterSpacing: 0.5 },
  pronounceRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, gap: spacing.lg },
  pronounceText: { flex: 1 },
  pronounceTitle: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: '700' },
  pronounceSub: { color: colors.textMuted, fontSize: typography.sizes.small, writingDirection: 'rtl', marginTop: 2 },
  slowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.goldFaint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
  slowText: { color: colors.gold, fontSize: typography.sizes.small, fontWeight: '600' },
  block: { marginTop: spacing.xl },
  syllRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  syllChip: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.15)',
  },
  syllStressed: { borderColor: colors.goldBright, backgroundColor: colors.goldFaint },
  syllText: { color: colors.textSecondary, fontSize: typography.sizes.h3, fontWeight: '600' },
  syllTextStressed: { color: colors.goldBright, fontWeight: '800' },
  syllDot: { color: colors.textMuted, fontSize: typography.sizes.h2, marginHorizontal: 2 },
  syllHint: {
    color: colors.textMuted,
    fontSize: typography.sizes.tiny,
    textAlign: 'center',
    marginTop: spacing.md,
    writingDirection: 'rtl',
  },
  definition: { color: colors.textPrimary, fontSize: typography.sizes.body, lineHeight: 24 },
  arabic: { color: colors.textSecondary, fontSize: typography.sizes.body, lineHeight: 26, writingDirection: 'rtl' },
  ltrMeaning: { writingDirection: 'ltr', textAlign: 'left' },
  meaningHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  translateLoading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  translateHint: { color: colors.textMuted, fontSize: typography.sizes.small },
  translateFail: { color: colors.textMuted, fontSize: typography.sizes.small, writingDirection: 'rtl', lineHeight: 22 },
  exampleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  example: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.body, fontStyle: 'italic', lineHeight: 24 },
  exampleAr: { color: colors.textMuted, fontSize: typography.sizes.small, marginTop: spacing.md, writingDirection: 'rtl' },
  synRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  synChip: {
    backgroundColor: colors.goldFaint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
  synText: { color: colors.goldSoft, fontSize: typography.sizes.small },
  noteInput: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    minHeight: 70,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  savedText: { color: colors.success, fontSize: typography.sizes.tiny },
});
