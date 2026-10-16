/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com
 */

// Styles
import 'vuetify/styles'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'

// Composables
import { createVuetify } from 'vuetify'
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n'
import { useI18n } from 'vue-i18n'

// i18n — глобальный экземпляр vue-i18n, созданный в src/i18n.
// Импорт гарантирует, что i18n инициализирован до создания Vuetify,
// поэтому начальный язык адаптера читается корректно.
import { i18n } from '@/i18n'

/* Официальный адаптер vue-i18n для Vuetify. Передаём в него
   созданный экземпляр i18n и useI18n из vue-i18n — адаптер
   самостоятельно синхронизирует Vuetify с глобальным composer.
   vuetify.framework.locale вручную НЕ присваивается.
   Строгая типизация ключей нашего i18n несовместима по инвариантности
   t() с обобщённой сигнатурой адаптера (I18n<any, ..., string, false>),
   поэтому экземпляр приводится к ожидаемому типу параметра адаптера. */
const adapter = createVueI18nAdapter({
  i18n: i18n as unknown as Parameters<typeof createVueI18nAdapter>[0]['i18n'],
  useI18n,
})

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  /* Иконки — SVG-набор MDI (@mdi/js): имена импортируются
     из '@mdi/js' и передаются в :icon, tree-shaking работает,
     шрифтовые иконки (@mdi/font) не подключаются. */
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  locale: {
    adapter,
    locale: i18n.global.locale.value,
  },
  theme: {
    /* system — тема всегда берётся из ОС (prefers-color-scheme):
       ночью не станет светло из-за сохранения дневного выбора,
       так как выбор нигде не сохраняется. */
    defaultTheme: 'system',
    /* Палитра под эталон (Materialize):
       brown lighten-1 (#8D6E63) — навбар и акценты (primary),
       orange (#FF9800) — кнопки действия и тур (secondary).
       По эталону текст на оранжевом белый (в Materialize .btn — color:#fff),
       поэтому задаём on-secondary явно: MD-контраст Vuetify иначе выбрал бы
       чёрный, который на оранжевом смотрится плохо.

       Тёмная тема — не инверсия светлой, а MD3-палитра:
       поверхности тёмно-серые (не чёрные), primary светлее
       для контраста на тёмном фоне, secondary мягче.
       Подсветка elevation (overlay) берётся встроенной. */
    themes: {
      light: {
        colors: {
          primary: '#8D6E63',
          secondary: '#FF9800',
          'on-secondary': '#FFFFFF',
          /* surface-light — фон отключённых кнопок (FormFieldAction).
             Задаём явно: без него подтягивается дефолт Vuetify,
             а в паре с дефолтом тёмной темы (#424242) даёт
             резкий скачок яркости при переключении темы. */
          'surface-light': '#EEEEEE',
        },
      },
      dark: {
        colors: {
          /* Поверхности: MD3-тёмный — тёмно-серый, не чёрный.
             background — базовый фон приложения,
             surface — карточки и панели. */
          background: '#141210',
          surface: '#1E1B18',
          /* «Планшет»: рабочая область чуть светлее фона,
             чтобы читать как лист на тёмной подложке. */
          'surface-bright': '#2A2724',
          /* surface-variant — контейнерный тон (в т.ч. фон подсказок
             тура). Держим его тем же рядом, что и поверхность, иначе
             в тёмной теме он читается светлым «ореолом» на фоне
             приложения. */
          'surface-variant': '#2C2825',
          'on-surface-variant': '#E8E0D8',
          /* Primary: brown lighten-2 — светлее, чем в светлой,
             чтобы коричневый не тонул в тёмном. */
          primary: '#B09A8E',
          'on-primary': '#1E1B18',
          /* Secondary: orange lighten-2 — мягче чистого оранжевого
             на тёмном фоне; текст на нём тёмный по MD3. */
          secondary: '#FFB74D',
          'on-secondary': '#3E2723',
          /* surface-light — фон отключённых кнопок: уровень
             surface-bright, чтобы читаться как приглушённая
             поверхность, а не светлым пятном на тёмном фоне. */
          'surface-light': '#2A2724',
          outline: '#8D847B',
        },
      },
    },
  },
})
