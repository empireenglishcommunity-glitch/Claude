/**
 * Assessment question data extracted from the placement JSON files.
 * This is the single source of truth for the web assessment.
 */

// ============================================================
//  LISTENING MODULE — 15 questions across 3 speeds
// ============================================================
export const LISTENING_DATA = {
  sections: [
    {
      id: 'slow',
      speed: '80 WPM',
      level_target: 'L0-L1',
      label: 'Section A — Slow Speech',
      label_ar: 'القسم أ — كلام بطيء',
      transcript: "Hello. My name is David. I am a teacher. I work at a school near my house. Every morning I wake up at six thirty. I eat breakfast with my family. Then I drive to school. I like my job because the students are friendly. After work, I come home and cook dinner. I usually go to bed at ten o'clock.",
      questions: [
        { id: 'L1', question: "What is David's job?", options: ['Doctor', 'Teacher', 'Driver', 'Cook'], answer: 'Teacher' },
        { id: 'L2', question: 'What time does David wake up?', options: ['5:30', '6:00', '6:30', '7:00'], answer: '6:30' },
        { id: 'L3', question: 'How does David go to school?', options: ['Walk', 'Bus', 'Drive', 'Bicycle'], answer: 'Drive' },
        { id: 'L4', question: 'Why does David like his job?', options: ['Good money', 'Close to home', 'Friendly students', 'Short hours'], answer: 'Friendly students' },
        { id: 'L5', question: 'What does David do after work?', options: ['Exercise', 'Cook dinner', 'Watch TV', 'Read books'], answer: 'Cook dinner' },
      ],
    },
    {
      id: 'natural',
      speed: '130 WPM',
      level_target: 'L1-L2',
      label: 'Section B — Natural Speech',
      label_ar: 'القسم ب — كلام طبيعي',
      transcript: "I've been thinking about changing my daily routine recently. The problem is that I spend too much time on my phone in the morning instead of doing something productive. Last week I tried waking up thirty minutes earlier and going for a short walk. It was difficult at first, but by Thursday I actually started to enjoy it. I noticed that I felt more focused at work and had more energy in the afternoon. I'm going to keep this up and maybe add some reading time too.",
      questions: [
        { id: 'L6', question: "What is the speaker's problem?", options: ['Too much phone time in morning', 'Waking up too late', 'Not enough exercise', 'Working too hard'], answer: 'Too much phone time in morning' },
        { id: 'L7', question: 'What did the speaker try last week?', options: ['Reading a book', 'Waking up earlier and walking', 'Going to the gym', 'Meditating'], answer: 'Waking up earlier and walking' },
        { id: 'L8', question: 'When did the speaker start enjoying the new routine?', options: ['Monday', 'Wednesday', 'Thursday', 'Friday'], answer: 'Thursday' },
        { id: 'L9', question: 'What effect did the change have?', options: ['Better sleep', 'More focus and energy', 'Weight loss', 'New friends'], answer: 'More focus and energy' },
        { id: 'L10', question: 'What does the speaker plan to add?', options: ['Cooking', 'Swimming', 'Reading time', 'Meditation'], answer: 'Reading time' },
      ],
    },
    {
      id: 'rapid',
      speed: '160 WPM',
      level_target: 'L2-L3',
      label: 'Section C — Rapid Speech',
      label_ar: 'القسم ج — كلام سريع',
      transcript: "You know what's fascinating about the way languages evolve? It's that the changes aren't random — they follow patterns that linguists can actually predict to some degree. Take English for example. We've gone from a language with complex inflections, you know, case endings and verb conjugations similar to German, to one that relies heavily on word order and auxiliary verbs. And the thing is, this simplification happened because of contact with other languages, particularly during the Norman period when French and English speakers had to communicate with each other despite having very different grammatical systems.",
      questions: [
        { id: 'L11', question: 'According to the speaker, language changes are:', options: ['Completely random', 'Predictable to some degree', 'Always negative', 'Impossible to study'], answer: 'Predictable to some degree' },
        { id: 'L12', question: 'Old English was similar to which language?', options: ['French', 'Spanish', 'German', 'Arabic'], answer: 'German' },
        { id: 'L13', question: 'What does modern English rely on instead of inflections?', options: ['Tone', 'Word order and auxiliary verbs', 'Gender', 'Honorifics'], answer: 'Word order and auxiliary verbs' },
        { id: 'L14', question: 'What caused English to simplify?', options: ['Technology', 'Contact with other languages', 'Government policy', 'War'], answer: 'Contact with other languages' },
        { id: 'L15', question: 'Which historical period is mentioned?', options: ['Roman', 'Viking', 'Norman', 'Industrial'], answer: 'Norman' },
      ],
    },
  ],
}

// ============================================================
//  VOCABULARY MODULE — 40 questions across frequency bands
// ============================================================
export const VOCABULARY_DATA = {
  questions: [
    { id: 'V1', band: '1-500', word: 'happy', sentence: 'She is very ___.', options: ['fast', 'happy', 'heavy', 'hungry'], answer: 'happy' },
    { id: 'V2', band: '1-500', word: 'work', sentence: 'I ___ every day.', options: ['work', 'walk', 'wash', 'want'], answer: 'work' },
    { id: 'V3', band: '1-500', word: 'food', sentence: 'We need to buy some ___.', options: ['foot', 'food', 'floor', 'four'], answer: 'food' },
    { id: 'V4', band: '1-500', word: 'help', sentence: 'Can you ___ me please?', options: ['help', 'hear', 'hope', 'hurt'], answer: 'help' },
    { id: 'V5', band: '1-500', word: 'water', sentence: 'I want a glass of ___.', options: ['winter', 'water', 'weather', 'window'], answer: 'water' },
    { id: 'V6', band: '500-1000', word: 'kitchen', sentence: 'She is cooking in the ___.', options: ['garden', 'kitchen', 'bedroom', 'bathroom'], answer: 'kitchen' },
    { id: 'V7', band: '500-1000', word: 'beautiful', sentence: 'The sunset is ___.', options: ['beautiful', 'careful', 'powerful', 'wonderful'], answer: 'beautiful' },
    { id: 'V8', band: '500-1000', word: 'explain', sentence: 'Can you ___ this to me?', options: ['explore', 'explain', 'expect', 'express'], answer: 'explain' },
    { id: 'V9', band: '500-1000', word: 'decide', sentence: 'I need to ___ what to do.', options: ['describe', 'decide', 'deliver', 'develop'], answer: 'decide' },
    { id: 'V10', band: '500-1000', word: 'improve', sentence: 'I want to ___ my English.', options: ['improve', 'import', 'impress', 'include'], answer: 'improve' },
    { id: 'V11', band: '1000-1500', word: 'schedule', sentence: 'Let me check my ___.', options: ['schedule', 'school', 'science', 'scissors'], answer: 'schedule' },
    { id: 'V12', band: '1000-1500', word: 'opportunity', sentence: 'This is a great ___ for you.', options: ['operation', 'opportunity', 'opinion', 'opposite'], answer: 'opportunity' },
    { id: 'V13', band: '1000-1500', word: 'achieve', sentence: 'She worked hard to ___ her goals.', options: ['achieve', 'avoid', 'arrange', 'attach'], answer: 'achieve' },
    { id: 'V14', band: '1000-1500', word: 'experience', sentence: 'He has a lot of ___ in teaching.', options: ['experiment', 'experience', 'expression', 'expectation'], answer: 'experience' },
    { id: 'V15', band: '1000-1500', word: 'environment', sentence: 'We must protect the ___.', options: ['entertainment', 'environment', 'equipment', 'employment'], answer: 'environment' },
    { id: 'V16', band: '1500-2000', word: 'perspective', sentence: "I'd like to hear your ___ on this issue.", options: ['performance', 'permission', 'perspective', 'prediction'], answer: 'perspective' },
    { id: 'V17', band: '1500-2000', word: 'negotiate', sentence: 'They need to ___ a better deal.', options: ['navigate', 'negotiate', 'nominate', 'neutralize'], answer: 'negotiate' },
    { id: 'V18', band: '1500-2000', word: 'consequence', sentence: 'Every action has a ___.', options: ['conference', 'confidence', 'consequence', 'conscience'], answer: 'consequence' },
    { id: 'V19', band: '1500-2000', word: 'substantial', sentence: 'There was a ___ increase in sales.', options: ['suitable', 'sufficient', 'substantial', 'suspicious'], answer: 'substantial' },
    { id: 'V20', band: '1500-2000', word: 'acknowledge', sentence: 'He refused to ___ his mistake.', options: ['accomplish', 'accumulate', 'acknowledge', 'accommodate'], answer: 'acknowledge' },
    { id: 'V21', band: '2000-2500', word: 'resilient', sentence: "She's very ___ — she always bounces back from problems.", options: ['reluctant', 'resilient', 'relevant', 'religious'], answer: 'resilient' },
    { id: 'V22', band: '2000-2500', word: 'compromise', sentence: 'We need to find a ___.', options: ['competition', 'complement', 'compromise', 'complication'], answer: 'compromise' },
    { id: 'V23', band: '2000-2500', word: 'inevitable', sentence: 'Change is ___.', options: ['incredible', 'inevitable', 'invisible', 'individual'], answer: 'inevitable' },
    { id: 'V24', band: '2000-2500', word: 'ambiguous', sentence: 'His answer was very ___.', options: ['ambitious', 'ambiguous', 'abundant', 'abstract'], answer: 'ambiguous' },
    { id: 'V25', band: '2000-2500', word: 'deteriorate', sentence: 'The situation began to ___.', options: ['determine', 'deteriorate', 'demonstrate', 'distinguish'], answer: 'deteriorate' },
    { id: 'V26', band: '2500-3000', word: 'eloquent', sentence: 'She gave an ___ speech.', options: ['elegant', 'eloquent', 'elaborate', 'efficient'], answer: 'eloquent' },
    { id: 'V27', band: '2500-3000', word: 'meticulous', sentence: 'He is very ___ about details.', options: ['mysterious', 'meticulous', 'malicious', 'miraculous'], answer: 'meticulous' },
    { id: 'V28', band: '2500-3000', word: 'plausible', sentence: 'That sounds like a ___ explanation.', options: ['pleasant', 'plausible', 'previous', 'precious'], answer: 'plausible' },
    { id: 'V29', band: '2500-3000', word: 'pragmatic', sentence: 'We need a more ___ approach.', options: ['problematic', 'pragmatic', 'prolific', 'prominent'], answer: 'pragmatic' },
    { id: 'V30', band: '2500-3000', word: 'scrutinize', sentence: 'The committee will ___ every detail.', options: ['sacrifice', 'scrutinize', 'stimulate', 'speculate'], answer: 'scrutinize' },
    { id: 'V31', band: '3000-4000', word: 'conundrum', sentence: 'This is quite a ___.', options: ['consensus', 'conundrum', 'correlation', 'curriculum'], answer: 'conundrum' },
    { id: 'V32', band: '3000-4000', word: 'juxtapose', sentence: 'The artist likes to ___ light and dark.', options: ['justify', 'juxtapose', 'jeopardize', 'juggle'], answer: 'juxtapose' },
    { id: 'V33', band: '3000-4000', word: 'ubiquitous', sentence: 'Smartphones have become ___.', options: ['unanimous', 'ubiquitous', 'unprecedented', 'unambiguous'], answer: 'ubiquitous' },
    { id: 'V34', band: '3000-4000', word: 'ephemeral', sentence: 'Beauty is ___.', options: ['empirical', 'ephemeral', 'equivocal', 'existential'], answer: 'ephemeral' },
    { id: 'V35', band: '3000-4000', word: 'surreptitious', sentence: 'He made a ___ exit.', options: ['spontaneous', 'simultaneous', 'surreptitious', 'superfluous'], answer: 'surreptitious' },
    { id: 'V36', band: '4000-5000', word: 'obsequious', sentence: 'His ___ behavior annoyed everyone.', options: ['obstinate', 'obsequious', 'ostentatious', 'omniscient'], answer: 'obsequious' },
    { id: 'V37', band: '4000-5000', word: 'magnanimous', sentence: 'She was ___ in victory.', options: ['magnificent', 'magnanimous', 'meticulous', 'malevolent'], answer: 'magnanimous' },
    { id: 'V38', band: '4000-5000', word: 'perfunctory', sentence: 'He gave a ___ nod.', options: ['perpetual', 'perfunctory', 'pejorative', 'presumptuous'], answer: 'perfunctory' },
    { id: 'V39', band: '4000-5000', word: 'recalcitrant', sentence: 'The ___ student refused to cooperate.', options: ['redundant', 'recalcitrant', 'reprehensible', 'reminiscent'], answer: 'recalcitrant' },
    { id: 'V40', band: '4000-5000', word: 'perspicacious', sentence: 'A ___ observer would notice the difference.', options: ['pessimistic', 'perspicacious', 'presumptuous', 'problematic'], answer: 'perspicacious' },
  ],
}

// ============================================================
//  GRAMMAR MODULE — 25 questions
// ============================================================
export const GRAMMAR_DATA = {
  questions: [
    { id: 'G1', level: 'L0', topic: 'SVO order', question: 'Choose the correct sentence:', options: ['Like I coffee.', 'I like coffee.', 'Coffee I like.', 'I coffee like.'], answer: 'I like coffee.' },
    { id: 'G2', level: 'L0', topic: 'To be', question: 'She ___ a teacher.', options: ['am', 'is', 'are', 'be'], answer: 'is' },
    { id: 'G3', level: 'L0', topic: 'Present simple', question: 'He ___ to work every day.', options: ['go', 'goes', 'going', 'gone'], answer: 'goes' },
    { id: 'G4', level: 'L0', topic: 'Negation', question: 'I ___ like fish.', options: ['no', 'not', "don't", "doesn't"], answer: "don't" },
    { id: 'G5', level: 'L0', topic: 'Questions', question: '___ you speak English?', options: ['Are', 'Do', 'Is', 'Does'], answer: 'Do' },
    { id: 'G6', level: 'L1', topic: 'Present continuous', question: 'She ___ right now.', options: ['study', 'studies', 'is studying', 'studied'], answer: 'is studying' },
    { id: 'G7', level: 'L1', topic: 'Past simple', question: 'I ___ to the store yesterday.', options: ['go', 'went', 'gone', 'going'], answer: 'went' },
    { id: 'G8', level: 'L1', topic: 'Future', question: 'I ___ visit my friend tomorrow.', options: ['will', 'am', 'was', 'do'], answer: 'will' },
    { id: 'G9', level: 'L1', topic: 'Articles', question: 'I saw ___ interesting movie.', options: ['a', 'an', 'the', '—'], answer: 'an' },
    { id: 'G10', level: 'L1', topic: 'Prepositions', question: 'The book is ___ the table.', options: ['in', 'on', 'at', 'to'], answer: 'on' },
    { id: 'G11', level: 'L1', topic: 'Comparatives', question: 'This one is ___ than that one.', options: ['more big', 'bigger', 'biggest', 'big'], answer: 'bigger' },
    { id: 'G12', level: 'L1', topic: 'Count/uncount', question: 'How ___ water do you need?', options: ['many', 'much', 'some', 'any'], answer: 'much' },
    { id: 'G13', level: 'L2', topic: 'Present perfect', question: 'I ___ been to London.', options: ['have', 'has', 'had', 'am'], answer: 'have' },
    { id: 'G14', level: 'L2', topic: 'Present perfect vs past', question: 'She ___ here since 2020.', options: ['lived', 'has lived', 'is living', 'lives'], answer: 'has lived' },
    { id: 'G15', level: 'L2', topic: 'Passive voice', question: 'The book ___ by millions of people.', options: ['read', 'is read', 'reads', 'reading'], answer: 'is read' },
    { id: 'G16', level: 'L2', topic: 'Reported speech', question: 'She said she ___ tired.', options: ['is', 'was', 'be', 'been'], answer: 'was' },
    { id: 'G17', level: 'L2', topic: 'Conditionals (1st)', question: 'If it rains, I ___ at home.', options: ['stay', 'will stay', 'stayed', 'staying'], answer: 'will stay' },
    { id: 'G18', level: 'L2', topic: 'Relative clauses', question: 'The man ___ lives here is my friend.', options: ['which', 'who', 'whose', 'whom'], answer: 'who' },
    { id: 'G19', level: 'L2', topic: 'Modal verbs', question: 'You ___ see a doctor about that.', options: ['should', 'must to', 'can to', 'will to'], answer: 'should' },
    { id: 'G20', level: 'L2', topic: 'Gerund vs infinitive', question: 'I enjoy ___ books.', options: ['read', 'to read', 'reading', 'reads'], answer: 'reading' },
    { id: 'G21', level: 'L3', topic: 'Conditionals (2nd)', question: 'If I ___ rich, I would travel the world.', options: ['am', 'was', 'were', 'will be'], answer: 'were' },
    { id: 'G22', level: 'L3', topic: 'Conditionals (3rd)', question: 'If I had studied harder, I ___ passed.', options: ['will have', 'would have', 'should', 'could'], answer: 'would have' },
    { id: 'G23', level: 'L3', topic: 'Inversion', question: '___ had I arrived when the phone rang.', options: ['No sooner', 'Hardly', 'Barely', 'Scarcely'], answer: 'No sooner' },
    { id: 'G24', level: 'L3', topic: 'Subjunctive', question: 'I insist that he ___ on time.', options: ['is', 'be', 'will be', 'being'], answer: 'be' },
    { id: 'G25', level: 'L3', topic: 'Complex passive', question: 'The project is believed ___ completed next month.', options: ['to be', 'being', 'be', 'to being'], answer: 'to be' },
  ],
}

// ============================================================
//  SPEAKING MODULE — prompts and passages
// ============================================================
export const SPEAKING_DATA = {
  part_a_read_aloud: {
    title: 'Part A: Read Aloud',
    title_ar: 'الجزء أ: القراءة بصوت عالٍ',
    instructions: "Read the passage below clearly. Don't rush — speak at a comfortable pace.",
    instructions_ar: 'اقرأ النص أدناه بوضوح. لا تستعجل — تكلّم بسرعة مريحة.',
    duration_seconds: 90,
    passage: "Hello. My name is [your name]. I am from [your country]. I live in [your city]. I have a family. My father works every day. My mother is kind. I like to eat rice and chicken. I want to learn English because it is important. Thank you.",
  },
  part_b_spontaneous: {
    title: 'Part B: Speak Freely',
    title_ar: 'الجزء ب: تكلّم بحرية',
    instructions: 'Answer the question by speaking for about 60 seconds. There is no right or wrong answer — just speak naturally.',
    instructions_ar: 'أجب على السؤال بالتحدث لمدة ٦٠ ثانية تقريبًا. لا يوجد جواب صح أو خطأ — فقط تكلّم بشكل طبيعي.',
    duration_seconds: 60,
    prompt: 'Tell me about yourself. What is your name? Where are you from? What do you do? What are your hobbies?',
    prompt_ar: 'أخبرني عن نفسك. ما اسمك؟ من أين أنت؟ ماذا تعمل؟ ما هواياتك؟',
  },
  part_c_shadowing: {
    title: 'Part C: Listen & Repeat',
    title_ar: 'الجزء ج: استمع وكرّر',
    instructions: 'Listen to the sentence, then repeat it matching the rhythm and pronunciation as closely as possible.',
    instructions_ar: 'استمع للجملة، ثم كرّرها وحاول تطابق الإيقاع والنطق.',
    duration_seconds: 30,
    text_to_repeat: 'Hello. Nice to meet you. My name is Sarah. I am from New York.',
  },
}
