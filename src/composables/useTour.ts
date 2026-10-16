import { computed, getCurrentScope, onScopeDispose, shallowRef } from 'vue'

import { createGlobalState, useToggle } from '@vueuse/core'

import {
  STEP_NUMBERS,
  isFieldDisabled,
  resolveHandleStep,
  resolveProgressStep,
  stepKeys,
} from '@/domain/formModel'
import type { TourSnapshot } from '@/domain/formModel'

/**
 * composables/useTour.ts
 *
 * Глобальное состояние интерактивного тура: включён ли он сейчас.
 * Значение хранится на уровне модуля, поэтому панель
 * (layout/AppLayout.vue), рабочая область (CryptoWorkspace.vue) и
 * компоненты тура читают
 * одну и ту же реактивную переменную и всегда согласованы.
 *
 * Правила вычисления шагов (порядок полей, пропуск отключённых,
 * «первое пустое поле») живут не здесь, а в domain/formModel.ts:
 * это доменная логика формы, а не состояние тура.
 */
/* Глобальное состояние тура создаётся один раз (createGlobalState):
   панель (layout/AppLayout.vue), рабочая область (CryptoWorkspace.vue)
   и компоненты тура получают один и тот же ref. Внутри — useToggle
   из @vueuse/core: toggleTour() инвертирует значение, а запись
   tourActive.value = true/false остаётся доступной тестам. */
const useTourState = createGlobalState(() => useToggle(false))

/**
 * Источник данных тура — геттер снимка состояния формы, который
 * регистрирует рабочая область. Хранится в shallowRef: сам геттер
 * не реактивен, но вызывается внутри computeds, поэтому чтения
 * реактивных полей формы отслеживаются Vue.
 */
const source = shallowRef<(() => TourSnapshot) | null>(null)

export type { TourSnapshot }

/** Секции тура: params — горизонтальный степпер параметров и подсказки,
 *  sender/recipient — вертикальные таймлайны у колонок формы. */
export type TourSection = 'params' | 'sender' | 'recipient'

/**
 * Отключён ли шаг тура: 2 — у алгоритма нет методов, 3 — нет длин
 * ключа, 5 и 8 — алгоритм не умеет генерировать ключи. Индексы
 * шагов 1–9 в цепочке полей совпадают с номерами минус один.
 */
export function isStepDisabled(snapshot: TourSnapshot | null, step: number): boolean {
  if (!snapshot) return false
  return isFieldDisabled(snapshot, step - 1)
}

export function useTour() {
  /* Единое состояние тура (см. useTourState выше). */
  const [tourActive, toggleTour] = useTourState()

  /* Регистрирует источник данных тура. Вызывается из setup рабочей
     области; при её размонтировании регистрация снимается, чтобы тур
     не читал состояние размонтированной формы. */
  function registerTourSource(getSnapshot: () => TourSnapshot) {
    source.value = getSnapshot
    if (getCurrentScope()) {
      onScopeDispose(() => {
        if (source.value === getSnapshot) source.value = null
      })
    }
  }

  /* Текущий снимок формы (null — источник не зарегистрирован). */
  const snapshot = computed<TourSnapshot | null>(() => source.value?.() ?? null)

  /* Единая «ручка» (активный шаг) на всю цепочку 1–9. Порядок задаётся
     полями, а не DOM: 1 Алгоритм, 2 Метод, 3 Длина, 4 Отправитель,
     5 Публичный ключ, 6 Шифрование, 7 Получатель, 8 Приватный ключ,
     9 Проверка. Сначала шаг поля в фокусе, иначе — первый пустой по
     порядку. Отключённые поля пропускаются, их шаги показываются серыми. */
  const handleStep = computed<number>(() => resolveHandleStep(snapshot.value))

  /* Граница прогресса — первый ещё не заполненный включённый шаг, иначе
     последний шаг цепочки. В отличие от handleStep не учитывает фокус,
     поэтому по нему устойчиво приглушаются только предстоящие шаги. */
  const progressStep = computed<number>(() => resolveProgressStep(snapshot.value))

  /* Номер шага поля, находящегося в фокусе (null — фокуса нет). */
  const focusedStep = computed<number | null>(() => {
    const current = snapshot.value
    if (!current?.focusField) return null
    const index = stepKeys(current.inverted).indexOf(current.focusField)
    return index !== -1 ? STEP_NUMBERS[index]! : null
  })

  return {
    tourActive,
    toggleTour,
    registerTourSource,
    snapshot,
    handleStep,
    progressStep,
    focusedStep,
  }
}
