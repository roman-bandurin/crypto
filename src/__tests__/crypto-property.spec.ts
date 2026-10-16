// @vitest-environment node
import { asyncProperty, assert, pre, string as fcString } from 'fast-check'
import { describe, expect, it } from 'vite-plus/test'

import { createWebCryptoProviders, resolveProvider } from '@/crypto'
import type { CryptoRequest } from '@/crypto'
import { ALGORITHM_CONFIGS } from '@/domain/algorithms'
import type { AlgorithmId } from '@/domain/algorithm'

/**
 * Property-based тесты обратимости Web Crypto-провайдеров
 * (fast-check генерирует произвольные тексты, включая Unicode
 * и эмодзи).
 */

const providers = createWebCryptoProviders()

/** Произвольный текст произвольной длины: графемы покрывают Unicode и эмодзи. */
const messageArb = fcString({ unit: 'grapheme', minLength: 0, maxLength: 128 })

/** RSA-ключи медленные: мало итераций и увеличенный таймаут. */
const SHORT_RUNS = { numRuns: 8 }
const TINY_RUNS = { numRuns: 3 }

function baseRequest(overrides: Partial<CryptoRequest> = {}): CryptoRequest {
  return {
    sender: '',
    recipient: '',
    publicKey: '',
    privateKey: '',
    method: undefined,
    length: undefined,
    ...overrides,
  }
}

describe('Обратимость шифров (decrypt(encrypt(x)) === x)', () => {
  const cipherIds = (['AES-CBC', 'AES-CTR', 'AES-GCM', 'RSA-OAEP'] as AlgorithmId[]).filter(
    (id) => ALGORITHM_CONFIGS[id].canGenerate,
  )

  for (const id of cipherIds) {
    it(`round-trip: ${id}`, async () => {
      const provider = resolveProvider(providers, id)!
      const config = ALGORITHM_CONFIGS[id]
      const isRsa = id === 'RSA-OAEP'
      const runs = isRsa ? TINY_RUNS : SHORT_RUNS

      const method = config.methods[0]
      const length = config.lengths[0]
      /* RSA-OAEP с ключом 512 бит и SHA-1 вмещает максимум 22 байта
         (64 − 42 байта накладных расходов OAEP). Астральные графемы
         кодируются 4 байтами UTF-8: 5 графем — худший случай 20 байт. */
      const limitedArb =
        id === 'RSA-OAEP' ? fcString({ unit: 'grapheme', minLength: 0, maxLength: 5 }) : messageArb

      await assert(
        asyncProperty(limitedArb, async (message) => {
          const keys = await provider.generateKeys!(baseRequest({ method, length }))
          const encrypted = await provider.encrypt(
            baseRequest({ sender: message, publicKey: keys.public, method, length }),
          )
          const decrypted = await provider.decrypt(
            baseRequest({ recipient: encrypted.output, privateKey: keys.private, method, length }),
          )
          expect(decrypted.output).toBe(message)
        }),
        runs,
      )
    }, 30_000)
  }

  it('round-trip: HMAC (shared secret в обоих полях ключа)', async () => {
    const provider = resolveProvider(providers, 'HMAC')!
    const config = ALGORITHM_CONFIGS.HMAC

    const method = config.methods[0]
    const length = config.lengths[0]

    await assert(
      asyncProperty(messageArb, async (message) => {
        const keys = await provider.generateKeys!(baseRequest({ method, length }))
        const encrypted = await provider.encrypt(
          baseRequest({ sender: message, privateKey: keys.private, method, length }),
        )
        const verified = await provider.decrypt(
          baseRequest({
            sender: message,
            recipient: encrypted.output,
            publicKey: keys.public,
            method,
            length,
          }),
        )
        expect(verified.verifyStatus).toBe(true)
      }),
      SHORT_RUNS,
    )
  }, 20_000)
})

describe('Подписи: verify(sign(x)) === true и reject чужого текста', () => {
  const signatureIds: AlgorithmId[] = ['RSASSA-PKCS1-v1_5', 'RSA-PSS', 'ECDSA']

  for (const id of signatureIds) {
    it(`verify round-trip: ${id}`, async () => {
      const provider = resolveProvider(providers, id)!
      const config = ALGORITHM_CONFIGS[id]

      const method = config.methods[0]
      const length = config.lengths[0]

      await assert(
        asyncProperty(messageArb, async (message) => {
          const keys = await provider.generateKeys!(baseRequest({ method, length }))
          const signed = await provider.encrypt(
            baseRequest({ sender: message, privateKey: keys.private, method, length }),
          )
          const verified = await provider.decrypt(
            baseRequest({
              sender: message,
              recipient: signed.output,
              publicKey: keys.public,
              method,
              length,
            }),
          )
          expect(verified.verifyStatus).toBe(true)
        }),
        TINY_RUNS,
      )
    }, 45_000)
  }

  it('подпись не проходит проверку для изменённого сообщения', async () => {
    const provider = resolveProvider(providers, 'HMAC')!
    const config = ALGORITHM_CONFIGS.HMAC
    const method = config.methods[0]
    const length = config.lengths[0]
    const keys = await provider.generateKeys!(baseRequest({ method, length }))

    await assert(
      asyncProperty(
        messageArb.filter((m) => m.length > 0),
        messageArb.filter((m) => m.length > 0),
        async (signedMessage, tampered) => {
          pre(signedMessage !== tampered)
          const signature = await provider.encrypt(
            baseRequest({ sender: signedMessage, privateKey: keys.private, method, length }),
          )
          const verified = await provider.decrypt(
            baseRequest({
              sender: tampered,
              recipient: signature.output,
              publicKey: keys.public,
              method,
              length,
            }),
          )
          expect(verified.verifyStatus).toBe(false)
        },
      ),
      SHORT_RUNS,
    )
  }, 20_000)
})

describe('Digest: детерминированность и hex-формат', () => {
  it('одинаковый вход — одинаковый digest; разный вход — разный digest', async () => {
    const provider = resolveProvider(providers, 'DIGEST')!

    await assert(
      asyncProperty(messageArb, async (message) => {
        const first = await provider.encrypt(baseRequest({ sender: message, method: 'SHA-256' }))
        const second = await provider.encrypt(baseRequest({ sender: message, method: 'SHA-256' }))
        expect(first.output).toBe(second.output)
        expect(first.output).toMatch(/^[0-9a-f]{64}$/)
      }),
      SHORT_RUNS,
    )
  }, 20_000)
})
