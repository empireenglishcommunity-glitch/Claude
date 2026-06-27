'use client'

import { getStudyPlan } from '../../lib/scoring'

export default function AssessmentResults({ result }) {
  const { level, levels_by_module, scores, flag, flag_reason, level_info } = result
  const plan = getStudyPlan(level)

  const moduleLabels = {
    listening: { name: 'Listening', name_ar: 'الاستماع', icon: '👂' },
    vocabulary: { name: 'Vocabulary', name_ar: 'المفردات', icon: '📖' },
    grammar: { name: 'Grammar', name_ar: 'القواعد', icon: '✍️' },
    speaking: { name: 'Speaking', name_ar: 'التحدث', icon: '🎙️' },
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero result */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">{level_info.emoji}</div>
        <h2 className="text-3xl font-bold text-imperial-gold mb-2">
          {level} — {level_info.name}
        </h2>
        <p className="text-xl text-parchment font-arabic">{level_info.name_ar}</p>
      </div>

      {/* Score breakdown */}
      <div className="bg-midnight-navy/80 border border-steel/20 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-bold text-parchment mb-4 font-arabic">تفاصيل النتيجة</h3>
        <div className="space-y-4">
          {Object.entries(scores).map(([module, score]) => (
            <div key={module} className="flex items-center gap-3">
              <span className="text-2xl">{moduleLabels[module]?.icon}</span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-parchment text-sm font-arabic">{moduleLabels[module]?.name_ar}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-imperial-gold font-bold">{score}%</span>
                    <span className="text-xs px-2 py-0.5 bg-imperial-gold/10 text-imperial-gold rounded-full">
                      {levels_by_module[module]}
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-sovereign-black rounded-full overflow-hidden">
                  <div
                    className="h-full bg-imperial-gold rounded-full transition-all duration-700"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flag warning */}
      {flag && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-xl p-4 mb-6">
          <p className="text-yellow-400 text-sm font-arabic">
            ⚠️ ملاحظة: مستواك غير متساوٍ بين المهارات. سيراجع المؤسس نتيجتك خلال 48 ساعة.
          </p>
          <p className="text-yellow-600/80 text-xs mt-1" dir="ltr">{flag_reason}</p>
        </div>
      )}

      {/* Study Plan */}
      <div className="bg-midnight-navy/80 border border-imperial-gold/20 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-bold text-imperial-gold mb-4 font-arabic">خطتك المخصصة</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-sovereign-black/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-imperial-gold">{plan.daily_minutes}</p>
            <p className="text-xs text-steel font-arabic">دقيقة/يوم</p>
          </div>
          <div className="bg-sovereign-black/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-imperial-gold">{plan.duration}</p>
            <p className="text-xs text-steel font-arabic">المدة المتوقعة</p>
          </div>
          <div className="bg-sovereign-black/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-imperial-gold">{plan.vocab_target}</p>
            <p className="text-xs text-steel font-arabic">هدف المفردات</p>
          </div>
          <div className="bg-sovereign-black/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-imperial-gold">{plan.tasks_per_day}</p>
            <p className="text-xs text-steel font-arabic">مهام يومية</p>
          </div>
        </div>

        <h4 className="text-sm font-bold text-parchment mb-2 font-arabic">مجالات التركيز:</h4>
        <ul className="space-y-2">
          {plan.focus_areas.map((area, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-steel" dir="ltr">
              <span className="text-imperial-gold mt-0.5">•</span>
              <span>{area}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="text-center space-y-3">
        <a
          href="/"
          className="block w-full py-4 bg-imperial-gold text-sovereign-black font-bold text-lg rounded-lg hover:bg-imperial-gold/90 transition-colors"
        >
          ابدأ رحلتك الآن 🏛️
        </a>
        <p className="text-steel text-xs font-arabic">
          ستبدأ بـ {plan.first_week_tasks} مهام فقط في الأسبوع الأول، ثم تزيد تدريجيًا.
        </p>
      </div>
    </div>
  )
}
