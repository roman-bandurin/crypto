/**
 * plugins/index.ts
 *
 * Регистрация плагинов приложения (Vuetify + vue-i18n).
 * Импортируется из src/main.ts.
 */

// Plugins
import vuetify from './vuetify'

// i18n — глобальный экземпляр vue-i18n (начальный язык уже
// прочитан из localStorage при создании, см. src/i18n/index.ts)
import { i18n } from '@/i18n'

// Types
import type { App } from 'vue'
import { useTitle } from '@vueuse/core'

export function registerPlugins(app: App) {
  /* Начальный язык документа устанавливается при регистрации
     плагинов, до монтирования приложения (синхронизация при смене
     языка выполняется в composables/useLocale.ts). */
  if (typeof document !== 'undefined') {
    document.documentElement.lang = i18n.global.locale.value
  }

  /* Заголовок вкладки следует за сменой языка реактивно:
     useTitle принимает геттер и сам следит за зависимостями
     (t() читает текущую локаль composer'а). */
  useTitle(() => i18n.global.t('app.title'))

  /* Порядок важен: сначала i18n (глобальная инъекция переводов),
     затем vuetify — его locale-адаптер использует vue-i18n. */
  app.use(i18n)

  app.use(vuetify)
}
