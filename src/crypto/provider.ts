/**
 * crypto/provider.ts
 *
 * Единый контракт криптографического слоя.
 *
 * Слой не зависит ни от Vue, ни от i18n: вход и выход — только строки
 * и числа. Реализации поверх Web Crypto API лежат в webCrypto.ts.
 */

/** Входные данные криптографической операции: текущее состояние формы. */
export interface CryptoRequest {
  /** Текст отправителя — «Шифрование». */
  sender: string
  /** Шифртекст получателя — «Расшифровка». */
  recipient: string
  /** Публичный ключ: шифрование и проверка подписи. */
  publicKey: string
  /** Приватный ключ: подпись и расшифровка. */
  privateKey: string
  /** Метод хеш-функции или подписи (SHA-1…SHA-512), если у алгоритма есть методы. */
  method?: string | undefined
  /** Длина ключа в битах, если у алгоритма есть варианты длины. */
  length?: number | undefined
}

/** Результат операции, который оркестратор записывает в форму. */
export interface CryptoResult {
  output: string
  verifyStatus?: boolean | undefined
}

/** Типизированный асинхронный делегат криптографической операции. */
type CryptoOperation = (request: CryptoRequest) => Promise<CryptoResult>

/** Результат генерации сериализованной пары ключей. */
export interface GeneratedKeys {
  public: string
  private: string
}

/** Семантический провайдер алгоритма, без строкового dispatch. */
export interface CryptoProvider {
  encrypt: CryptoOperation
  decrypt: CryptoOperation
  generateKeys?: ((request: CryptoRequest) => Promise<GeneratedKeys>) | undefined
}

/** Карта провайдеров по идентификатору алгоритма. */
export type CryptoProviderMap = Partial<Record<string, CryptoProvider>>
