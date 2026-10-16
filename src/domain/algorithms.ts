/**
 * domain/algorithms.ts
 *
 * Справочник алгоритмов и структура списка выбора.
 *
 * Данные вынесены из монолитного компонента (ныне
 * workspace/CryptoWorkspace.vue) без изменения значений: те же методы,
 * длины ключа, имена действий и иконки групп.
 */

import {
  mdiAsterisk,
  mdiFileSign,
  mdiFormatHeaderPound,
  mdiLockOutline,
  mdiShuffleDisabled,
  mdiSwapHorizontal,
} from '@mdi/js'

import type { AlgorithmConfig, AlgorithmId, AlgorithmItem } from '@/domain/algorithm'

/** Набор алгоритмов, доступных в форме. */
export const ALGORITHM_CONFIGS: Record<AlgorithmId, AlgorithmConfig> = {
  DIGEST: {
    methods: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'],
    lengths: [],
    inverted: false,
    canGenerate: false,
  },
  'AES-CBC': {
    methods: [],
    lengths: [128, 192, 256],
    inverted: false,
    canGenerate: true,
  },
  'AES-CTR': {
    methods: [],
    lengths: [128, 192, 256],
    inverted: false,
    canGenerate: true,
  },
  'AES-GCM': {
    methods: [],
    lengths: [128, 192, 256],
    inverted: false,
    canGenerate: true,
  },
  'RSA-OAEP': {
    methods: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'],
    lengths: [512, 1024, 2048, 4096],
    inverted: true,
    canGenerate: true,
  },
  'RSASSA-PKCS1-v1_5': {
    methods: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'],
    lengths: [512, 1024, 2048, 4096],
    inverted: true,
    canGenerate: true,
  },
  'RSA-PSS': {
    methods: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'],
    lengths: [512, 1024, 2048, 4096],
    inverted: true,
    canGenerate: true,
  },
  ECDSA: {
    methods: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'],
    lengths: [256, 384, 521],
    inverted: true,
    canGenerate: true,
  },
  HMAC: {
    methods: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'],
    lengths: [512, 1024, 2048, 4096],
    inverted: false,
    canGenerate: true,
  },
}

/**
 * Пункты селекта алгоритмов: строки-алгоритмы и заголовки групп.
 * Иконки — пары SVG-path из @mdi/js (VSvgIcon поддерживает массив
 * путей); заголовок — ключ i18n, переводится в AlgorithmSelect.
 */
export const ALGORITHM_ITEMS: AlgorithmItem[] = [
  {
    props: {
      icon: [mdiFormatHeaderPound, mdiAsterisk],
      header: 'algorithms.groups.hashing',
    },
  },
  'DIGEST',
  {
    props: {
      icon: [mdiLockOutline, mdiSwapHorizontal],
      header: 'algorithms.groups.symmetricEncryption',
    },
  },
  'AES-CBC',
  'AES-CTR',
  'AES-GCM',
  {
    props: {
      icon: [mdiLockOutline, mdiShuffleDisabled],
      header: 'algorithms.groups.asymmetricEncryption',
    },
  },
  'RSA-OAEP',
  {
    props: {
      icon: [mdiFileSign, mdiShuffleDisabled],
      header: 'algorithms.groups.asymmetricSignature',
    },
  },
  'RSASSA-PKCS1-v1_5',
  'RSA-PSS',
  'ECDSA',
  {
    props: {
      icon: [mdiFileSign, mdiSwapHorizontal],
      header: 'algorithms.groups.symmetricSignature',
    },
  },
  'HMAC',
]
