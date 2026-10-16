/**
 * domain/algorithm.ts
 *
 * Типы доменной модели криптографического алгоритма.
 *
 * Слой `domain` ничего не знает о Vue-компонентах и Vuetify: здесь
 * только структура данных, которую используют форма, тур и криптослой.
 */

/** Идентификатор алгоритма: ключ справочника ALGORITHM_CONFIGS. */
export type AlgorithmId =
  | 'DIGEST'
  | 'AES-CBC'
  | 'AES-CTR'
  | 'AES-GCM'
  | 'RSA-OAEP'
  | 'RSASSA-PKCS1-v1_5'
  | 'RSA-PSS'
  | 'ECDSA'
  | 'HMAC'

/**
 * Возможности алгоритма, из которых форма строит элементы интерфейса:
 * доступные методы и длины ключа, имена действий «шифровать»/«расшифровать»,
 * признак инверсии ключей (асимметричные алгоритмы меняют ключи местами)
 * и возможность сгенерировать пару ключей.
 */
export interface AlgorithmConfig {
  methods: string[]
  lengths: number[]
  inverted: boolean
  canGenerate: boolean
}

/** Заглушка на случай неизвестного идентификатора алгоритма. */
export const DEFAULT_ALGORITHM_CONFIG: AlgorithmConfig = {
  methods: [],
  lengths: [],
  inverted: false,
  canGenerate: false,
}

/** SVG-path иконки из @mdi/js (строковый путь, без зависимости от Vuetify). */
type IconPath = string

/** Разделитель списка выбора: заголовок группы алгоритмов. */
interface AlgorithmGroupItem {
  props: {
    /** Ключ i18n заголовка, переводится в AlgorithmSelect. */
    header: string
    /** Пара иконок: основная и дополнительная для бейджа. */
    icon: [IconPath, IconPath]
  }
}

/** Элемент списка выбора: либо идентификатор алгоритма, либо заголовок группы. */
export type AlgorithmItem = AlgorithmId | AlgorithmGroupItem
