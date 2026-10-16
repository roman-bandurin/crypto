/**
 * composables/useLocale.ts
 *
 * Единая точка управления языком интерфейса. Читает текущий язык
 * из ГЛОБАЛЬНОГО composer'а i18n (не создаёт второй ref), а
 * setLocale меняет только composer: запись в localStorage выполняет
 * syncRef (src/i18n/index.ts), а атрибут lang корневого элемента
 * документа синхронизирует watch на текущей локали.
 */

import { readonly, watch } from 'vue'

import { useEventListener } from '@vueuse/core'

import { i18n } from '@/i18n'
import type { AppLocale } from '@/i18n'

/* Глобальный composer vue-i18n. currentLocale — readonly-обёртка
   над его locale, поэтому переключение через setLocale сразу
   отражается во всех компонентах, использующих useLocale(). */
const currentLocale = readonly(i18n.global.locale)

/* Атрибут lang корневого элемента документа следует за локалью.
   watch регистрируется на уровне модуля: он живёт столько же,
   сколько приложение, и отдельного onScopeDispose не требует.
   document может отсутствовать (SSR / окружения без DOM) —
   тогда присваивание пропускается. */
watch(currentLocale, (locale) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
})

export function useLocale() {
  /* Синхронизация lang при изменениях хранилища из другой вкладки:
     событие storage обновит localeStorage, syncRef передаст значение
     в composer, а watch выше применит его к документу. Слушатель
     снимается автоматически при закрытии страницы. */
  useEventListener(window, 'storage', () => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = i18n.global.locale.value
    }
  })

  /* Меняет язык: только composer vue-i18n. Запись в localStorage
     делает syncRef в src/i18n/index.ts, атрибут lang документа —
     модульный watch выше. Все шаги защищены от недоступности
     документа — например, при SSR или в окружениях без DOM. */
  function setLocale(locale: AppLocale) {
    i18n.global.locale.value = locale
  }

  return { currentLocale, setLocale }
}
