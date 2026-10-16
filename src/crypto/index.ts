/**
 * Единая точка входа криптослоя: фабрика провайдеров и оркестратор.
 */

import type { AlgorithmId } from '@/domain/algorithm'
import type { CryptoProviderMap } from '@/crypto/provider'

export type { CryptoProviderMap, CryptoRequest } from '@/crypto/provider'

export { createWebCryptoProviders } from '@/crypto/webCrypto'

/**
 * Провайдер текущего алгоритма. Возвращает undefined, если для
 * алгоритма реализации нет: вызов кнопки остаётся безопасным no-op.
 */
export function resolveProvider(
  providers: CryptoProviderMap,
  algorithm: AlgorithmId,
): CryptoProviderMap[AlgorithmId] {
  return providers[algorithm]
}
