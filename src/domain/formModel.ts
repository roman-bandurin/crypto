/**
 * domain/formModel.ts
 *
 * Состояние и правила формы криптографического сервиса.
 *
 * Здесь живут все ссылки (refs) полей, сбросы формы и вычисление
 * цепочки шагов тура 1–9. Слой не зависит от компонентов Vue и
 * Vuetify: только `ref`/`computed` из vue.
 */

import { computed, ref } from 'vue'

import { whenever } from '@vueuse/core'

import { DEFAULT_ALGORITHM_CONFIG } from '@/domain/algorithm'
import type { AlgorithmConfig, AlgorithmId } from '@/domain/algorithm'
import { ALGORITHM_CONFIGS } from '@/domain/algorithms'

/** Номера шагов тура 1–9. */
export const STEP_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

/** Снимок состояния формы, из которого тур считает прогресс шагов. */
export interface TourSnapshot {
  algorithm: AlgorithmId
  method: string | null
  length: number | null
  sender: string
  recipient: string
  publicKey: string
  privateKey: string
  code: string
  decode: string
  /** Поле, в котором сейчас стоит фокус: ручка (карандаш) показывается
   *  у его шага, а если фокус нигде — у первого пустого поля по порядку. */
  focusField: string | null
  /** Результат проверки: true — успех, false — неуспех, null — ещё не
   *  выполнялась либо сброшена. Окрашивает поле «Проверка» и шаг 9. */
  verifyStatus: boolean | null
  /** Возможности текущего алгоритма: есть ли методы, длины ключа
   *  и генерация ключей — определяют отключённые шаги цепочки. */
  hasMethods: boolean
  hasLengths: boolean
  canGenerate: boolean
  /** Асимметричные алгоритмы: ключи меняются местами в цепочке шагов. */
  inverted: boolean
}

/**
 * Порядок полей в цепочке 1–9 с учётом инверсии ключей: в асимметричных
 * алгоритмах (inverted) на позиции 5 встаёт приватный ключ, на позиции 8 —
 * публичный.
 */
export function stepKeys(inverted: boolean): string[] {
  const keyAt5 = inverted ? 'private' : 'public'
  const keyAt8 = inverted ? 'public' : 'private'
  return ['algorithm', 'method', 'length', 'sender', keyAt5, 'code', 'recipient', keyAt8, 'decode']
}

/** Значения полей снимка по ключам цепочки. */
function snapshotValues(snapshot: TourSnapshot): Record<string, unknown> {
  return {
    algorithm: snapshot.algorithm,
    method: snapshot.method,
    length: snapshot.length,
    sender: snapshot.sender,
    public: snapshot.publicKey,
    private: snapshot.privateKey,
    code: snapshot.code,
    recipient: snapshot.recipient,
    decode: snapshot.decode,
  }
}

/**
 * Отключено ли поле на позиции цепочки: такие шаги серые и пропускаются
 * при поиске первого пустого (2 Метод, 3 Длина, 5 и 8 Ключи — по индексам
 * 0…8).
 */
export function isFieldDisabled(snapshot: TourSnapshot, index: number): boolean {
  if (index === 1) return !snapshot.hasMethods
  if (index === 2) return !snapshot.hasLengths
  if (index === 4 || index === 7) return !snapshot.canGenerate
  return false
}

/**
 * Шаг тура, который считается активным: сначала шаг поля в фокусе,
 * иначе — первый пустой по порядку. Отключённые поля пропускаются.
 */
export function resolveHandleStep(snapshot: TourSnapshot | null): number {
  if (!snapshot) return STEP_NUMBERS[0]
  const keys = stepKeys(snapshot.inverted)
  const values = snapshotValues(snapshot)
  if (snapshot.focusField) {
    const focused = keys.indexOf(snapshot.focusField)
    if (focused !== -1) return STEP_NUMBERS[focused]!
  }
  for (let i = 0; i < STEP_NUMBERS.length; i++) {
    if (isFieldDisabled(snapshot, i)) continue
    if (!values[keys[i]!]) return STEP_NUMBERS[i]!
  }
  return STEP_NUMBERS[0]
}

/**
 * Граница прогресса — первый ещё не заполненный включённый шаг, иначе
 * последний шаг цепочки. В отличие от активного шага не учитывает фокус,
 * поэтому по нему устойчиво приглушаются только предстоящие шаги.
 */
export function resolveProgressStep(snapshot: TourSnapshot | null): number {
  if (!snapshot) return STEP_NUMBERS[0]
  const keys = stepKeys(snapshot.inverted)
  const values = snapshotValues(snapshot)
  for (let i = 0; i < STEP_NUMBERS.length; i++) {
    if (isFieldDisabled(snapshot, i)) continue
    if (!values[keys[i]!]) return STEP_NUMBERS[i]!
  }
  return STEP_NUMBERS[STEP_NUMBERS.length - 1]!
}

/**
 * Composable состояния формы. Возвращает ссылки полей, текущий алгоритм
 * и снимок для тура. Криптографические действия (шифрование, подпись,
 * проверка) добавляются криптослоем поверх этих полей.
 */
export function useCryptoForm() {
  const algorithm = ref<AlgorithmId>('DIGEST')
  const method = ref<string | null>(null)
  const length = ref<number | null>(null)

  const sender = ref('')
  const recipient = ref('')

  const publicKey = ref('')
  const privateKey = ref('')

  const code = ref('')
  const decode = ref('')

  /** Поле, в котором сейчас стоит фокус. */
  const focusField = ref<string | null>(null)
  /** Результат проверки: true — успех, false — неуспех, null — ещё не
   *  выполнялась либо сброшена. */
  const verifyStatus = ref<boolean | null>(null)

  /** Возможности текущего алгоритма для интерфейса и тура. */
  const currentAlgorithm = computed<AlgorithmConfig>(
    () => ALGORITHM_CONFIGS[algorithm.value] ?? DEFAULT_ALGORITHM_CONFIG,
  )

  /** Фиксирует поле с фокусом; потеря фокуса снимает его, если активным было оно. */
  function onFieldFocus(field: string, focused: boolean) {
    if (focused) {
      focusField.value = field
    } else if (focusField.value === field) {
      focusField.value = null
    }
  }

  /** Смена алгоритма сбрасывает зависимые поля и результат проверки. */
  function algorithmReset() {
    method.value = null
    length.value = null
    verifyStatus.value = null
  }

  /** «Получить»: забирает шифртекст в поле получателя и сбрасывает проверку. */
  function send() {
    recipient.value = code.value
    verifyStatus.value = null
  }

  /** Очистка поля «Проверка» возвращает результат в обычное состояние:
      whenever выполняет колбэк только когда условие истинно (поле пусто). */
  whenever(
    () => !decode.value,
    () => {
      verifyStatus.value = null
    },
  )

  /** Снимок состояния формы для тура. */
  const snapshot = computed<TourSnapshot>(() => ({
    algorithm: algorithm.value,
    method: method.value,
    length: length.value,
    sender: sender.value,
    recipient: recipient.value,
    publicKey: publicKey.value,
    privateKey: privateKey.value,
    code: code.value,
    decode: decode.value,
    focusField: focusField.value,
    verifyStatus: verifyStatus.value,
    hasMethods: currentAlgorithm.value.methods.length > 0,
    hasLengths: currentAlgorithm.value.lengths.length > 0,
    canGenerate: currentAlgorithm.value.canGenerate,
    inverted: currentAlgorithm.value.inverted,
  }))

  return {
    algorithm,
    method,
    length,
    sender,
    recipient,
    publicKey,
    privateKey,
    code,
    decode,
    focusField,
    verifyStatus,
    currentAlgorithm,
    snapshot,
    onFieldFocus,
    algorithmReset,
    send,
  }
}
