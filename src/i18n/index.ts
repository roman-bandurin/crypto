/**
 * i18n/index.ts
 *
 * Глобальная конфигурация vue-i18n (Composition API, legacy: false).
 * Начальный язык читается из localStorage ('crypto.locale') через
 * useLocalStorage из @vueuse/core: реактивный ref хранилища валидирует
 * значение при чтении ('ru'/'en' принимаются, всё остальное — отсутствие,
 * некорректное значение, ошибка доступа — приводит к 'ru').
 * Автоопределение языка браузера НЕ выполняется.
 */

import { syncRef, useLocalStorage } from '@vueuse/core'
import type { Ref } from 'vue'

import { createI18n } from 'vue-i18n'

// Встроенные словари Vuetify (aria-label бейджей, меню, правила валидации).
// Адаптер vue-i18n НЕ подставляет их сам: компоненты Vuetify обращаются
// к ключам вида '$vuetify.badge', поэтому словари обязаны лежать в i18n.
import { en as vuetifyEn, ru as vuetifyRu } from 'vuetify/locale'

import ru from './locales/ru'
import en from './locales/en'

export type AppLocale = 'ru' | 'en'

const STORAGE_KEY = 'crypto.locale'

/* Поддерживаемые языки. Порядок элементов не важен: он нужен
   только для проверки принадлежности значения. */
const SUPPORTED_LOCALES: readonly AppLocale[] = ['ru', 'en'] as const

/* Реактивное хранилище сохранённого языка. useLocalStorage сам защищён
   от отсутствия window/localStorage (например, при SSR или в окружениях
   без DOM) — в этом случае ref работает как обычный ref с дефолтом.
   Сериализатор читает значение с валидацией: недопустимые строки
   приводятся к 'ru'. writeDefaults запрещает записывать дефолт в
   storage без явного выбора пользователя. */
const localeStorage = useLocalStorage<AppLocale>(STORAGE_KEY, 'ru', {
  writeDefaults: false,
  serializer: {
    read: (value: string): AppLocale =>
      SUPPORTED_LOCALES.includes(value as AppLocale) ? (value as AppLocale) : 'ru',
    write: (value: AppLocale) => value,
  },
})

export const i18n = createI18n({
  legacy: false,
  locale: localeStorage.value,
  fallbackLocale: 'en',
  // Секция $vuetify обязательна: без неё в консоль сыпятся
  // «Not found '$vuetify.*' key» и бейджи отдают наружу сырые ключи.
  messages: {
    ru: { ...ru, $vuetify: vuetifyRu },
    en: { ...en, $vuetify: vuetifyEn },
  },
})

/* Двусторонняя синхронизация composer'а vue-i18n и хранилища:
   setLocale() в composables/useLocale.ts меняет только composer,
   syncRef сам записывает выбор в localStorage; изменение в другой
   вкладке (событие storage) подхватывается обратно. Без syncRef
   оба ref были бы независимыми и разошлись бы. */
syncRef(localeStorage as Ref<AppLocale>, i18n.global.locale as Ref<AppLocale>)

/* Начальный язык документа устанавливается при регистрации
   плагинов (src/plugins/index.ts), а не здесь — чтобы не
   дублировать логику синхронизации document.documentElement.lang. */
