import type { CryptoProvider, CryptoRequest, CryptoResult, GeneratedKeys } from '@/crypto/provider'
import type { AlgorithmId } from '@/domain/algorithm'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

type OwnedBytes = Uint8Array<ArrayBuffer>

function ownedBytes(value: ArrayBuffer | ArrayBufferView): OwnedBytes {
  const source =
    value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  const result = new Uint8Array(new ArrayBuffer(source.byteLength))
  result.set(source)
  return result
}

function textToBytes(value: string): ArrayBuffer {
  return ownedBytes(encoder.encode(value)).buffer
}

function bytesToText(value: ArrayBuffer): string {
  return decoder.decode(value)
}

function hexToBytes(value: string): ArrayBuffer {
  const normalized = value.trim()
  /* Пустая строка — легитимный вход: шифрование пустого сообщения
     даёт шифртекст нулевой длины (например, AES-CTR без паддинга). */
  if (normalized.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(normalized)) {
    throw new Error('Ожидалась hex-строка с чётным числом символов')
  }

  const bytes = new Uint8Array(new ArrayBuffer(normalized.length / 2))
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes.buffer
}

function bytesToHex(value: ArrayBuffer | ArrayBufferView): string {
  return Array.from(ownedBytes(value), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function requiredMethod(request: CryptoRequest): string {
  if (!request.method) throw new Error('Не выбран метод алгоритма')
  return request.method
}

function requiredLength(request: CryptoRequest, fallback = 256): number {
  return request.length ?? fallback
}

interface SymmetricCipherSpec {
  readonly name: 'AES-CBC' | 'AES-CTR' | 'AES-GCM'
  readonly buildParams: (iv: OwnedBytes) => AesCbcParams | AesCtrParams | AesGcmParams
}

function createDigestProvider(): CryptoProvider {
  return {
    async encrypt(request): Promise<CryptoResult> {
      const digest = await crypto.subtle.digest(
        requiredMethod(request),
        textToBytes(request.sender),
      )
      return { output: bytesToHex(digest) }
    },
    async decrypt(request): Promise<CryptoResult> {
      const digest = await crypto.subtle.digest(
        requiredMethod(request),
        textToBytes(request.sender),
      )
      const expected = bytesToHex(digest)
      return {
        output: request.recipient,
        verifyStatus: expected === request.recipient.trim().toLowerCase(),
      }
    },
  }
}

function createSymmetricProvider(spec: SymmetricCipherSpec): CryptoProvider {
  const keyAlgorithm = { name: spec.name }
  return {
    async generateKeys(request): Promise<GeneratedKeys> {
      const key = await crypto.subtle.generateKey(
        { name: spec.name, length: requiredLength(request) },
        true,
        ['encrypt', 'decrypt'],
      )
      const raw = await crypto.subtle.exportKey('raw', key)
      const serialized = bytesToHex(raw)
      return { public: serialized, private: serialized }
    },
    async encrypt(request): Promise<CryptoResult> {
      const iv = new Uint8Array(new ArrayBuffer(16))
      crypto.getRandomValues(iv)
      const key = await crypto.subtle.importKey(
        'raw',
        hexToBytes(request.publicKey),
        keyAlgorithm,
        false,
        ['encrypt'],
      )
      const encrypted = await crypto.subtle.encrypt(
        spec.buildParams(iv),
        key,
        textToBytes(request.sender),
      )
      return { output: `${bytesToHex(iv)}${bytesToHex(encrypted)}` }
    },
    async decrypt(request): Promise<CryptoResult> {
      const iv = ownedBytes(hexToBytes(request.recipient.slice(0, 32)))
      const encrypted = hexToBytes(request.recipient.slice(32))
      const key = await crypto.subtle.importKey(
        'raw',
        hexToBytes(request.privateKey),
        keyAlgorithm,
        false,
        ['decrypt'],
      )
      const decrypted = await crypto.subtle.decrypt(spec.buildParams(iv), key, encrypted)
      return { output: bytesToText(decrypted), verifyStatus: true }
    },
  }
}

function createRsaOaepProvider(): CryptoProvider {
  return {
    async generateKeys(request): Promise<GeneratedKeys> {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          hash: { name: requiredMethod(request) },
          modulusLength: requiredLength(request, 2048),
          publicExponent: new Uint8Array([1, 0, 1]),
        },
        true,
        ['encrypt', 'decrypt'],
      )
      const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey)
      const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
      return { public: bytesToHex(publicKey), private: bytesToHex(privateKey) }
    },
    async encrypt(request): Promise<CryptoResult> {
      const key = await crypto.subtle.importKey(
        'spki',
        hexToBytes(request.publicKey),
        { name: 'RSA-OAEP', hash: { name: requiredMethod(request) } },
        false,
        ['encrypt'],
      )
      const encrypted = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        key,
        textToBytes(request.sender),
      )
      return { output: bytesToHex(encrypted) }
    },
    async decrypt(request): Promise<CryptoResult> {
      const key = await crypto.subtle.importKey(
        'pkcs8',
        hexToBytes(request.privateKey),
        { name: 'RSA-OAEP', hash: { name: requiredMethod(request) } },
        false,
        ['decrypt'],
      )
      const decrypted = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        key,
        hexToBytes(request.recipient),
      )
      return { output: bytesToText(decrypted), verifyStatus: true }
    },
  }
}

interface SignatureProviderSpec {
  readonly name: 'RSASSA-PKCS1-v1_5' | 'RSA-PSS' | 'ECDSA' | 'HMAC'
  readonly generate: (request: CryptoRequest) => Promise<CryptoKeyPair | CryptoKey>
  readonly importPrivate: (request: CryptoRequest) => Promise<CryptoKey>
  readonly importPublic: (request: CryptoRequest) => Promise<CryptoKey>
  readonly exportKeys: (keys: CryptoKeyPair | CryptoKey) => Promise<GeneratedKeys>
  readonly signAlgorithm: (
    request: CryptoRequest,
  ) => AlgorithmIdentifier | RsaPssParams | EcdsaParams
}

function createSignatureProvider(spec: SignatureProviderSpec): CryptoProvider {
  return {
    async generateKeys(request) {
      return spec.exportKeys(await spec.generate(request))
    },
    async encrypt(request) {
      const key = await spec.importPrivate(request)
      const signature = await crypto.subtle.sign(
        spec.signAlgorithm(request),
        key,
        textToBytes(request.sender),
      )
      return { output: bytesToHex(signature) }
    },
    async decrypt(request) {
      const key = await spec.importPublic(request)
      const valid = await crypto.subtle.verify(
        spec.signAlgorithm(request),
        key,
        hexToBytes(request.recipient),
        textToBytes(request.sender),
      )
      return { output: request.recipient, verifyStatus: valid }
    },
  }
}

function hashName(request: CryptoRequest): HashAlgorithmIdentifier {
  return { name: requiredMethod(request) }
}

function rsaSignatureProvider(name: 'RSASSA-PKCS1-v1_5' | 'RSA-PSS'): CryptoProvider {
  return createSignatureProvider({
    name,
    generate: async (request) =>
      crypto.subtle.generateKey(
        {
          name,
          hash: hashName(request),
          modulusLength: requiredLength(request, 2048),
          publicExponent: new Uint8Array([1, 0, 1]),
        },
        true,
        ['sign', 'verify'],
      ),
    importPrivate: (request) =>
      crypto.subtle.importKey(
        'pkcs8',
        hexToBytes(request.privateKey),
        { name, hash: hashName(request) },
        false,
        ['sign'],
      ),
    importPublic: (request) =>
      crypto.subtle.importKey(
        'spki',
        hexToBytes(request.publicKey),
        { name, hash: hashName(request) },
        false,
        ['verify'],
      ),
    exportKeys: async (keys) => {
      const pair = keys as CryptoKeyPair
      return {
        public: bytesToHex(await crypto.subtle.exportKey('spki', pair.publicKey)),
        private: bytesToHex(await crypto.subtle.exportKey('pkcs8', pair.privateKey)),
      }
    },
    signAlgorithm: (_request) => (name === 'RSA-PSS' ? { name, saltLength: 32 } : { name }),
  })
}

function ecdsaProvider(): CryptoProvider {
  return createSignatureProvider({
    name: 'ECDSA',
    generate: async (request) =>
      crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve:
            requiredLength(request, 256) === 521
              ? 'P-521'
              : requiredLength(request, 256) === 384
                ? 'P-384'
                : 'P-256',
        },
        true,
        ['sign', 'verify'],
      ),
    importPrivate: (request) =>
      crypto.subtle.importKey(
        'pkcs8',
        hexToBytes(request.privateKey),
        {
          name: 'ECDSA',
          namedCurve:
            requiredLength(request, 256) === 521
              ? 'P-521'
              : requiredLength(request, 256) === 384
                ? 'P-384'
                : 'P-256',
        },
        false,
        ['sign'],
      ),
    importPublic: (request) =>
      crypto.subtle.importKey(
        'spki',
        hexToBytes(request.publicKey),
        {
          name: 'ECDSA',
          namedCurve:
            requiredLength(request, 256) === 521
              ? 'P-521'
              : requiredLength(request, 256) === 384
                ? 'P-384'
                : 'P-256',
        },
        false,
        ['verify'],
      ),
    exportKeys: async (keys) => {
      const pair = keys as CryptoKeyPair
      return {
        public: bytesToHex(await crypto.subtle.exportKey('spki', pair.publicKey)),
        private: bytesToHex(await crypto.subtle.exportKey('pkcs8', pair.privateKey)),
      }
    },
    signAlgorithm: (request) => ({ name: 'ECDSA', hash: hashName(request) }),
  })
}

function hmacProvider(): CryptoProvider {
  return createSignatureProvider({
    name: 'HMAC',
    generate: (request) =>
      crypto.subtle.generateKey(
        { name: 'HMAC', hash: hashName(request), length: requiredLength(request, 256) },
        true,
        ['sign', 'verify'],
      ),
    importPrivate: (request) =>
      crypto.subtle.importKey(
        'raw',
        hexToBytes(request.privateKey),
        { name: 'HMAC', hash: hashName(request) },
        false,
        ['sign'],
      ),
    importPublic: (request) =>
      crypto.subtle.importKey(
        'raw',
        hexToBytes(request.publicKey),
        { name: 'HMAC', hash: hashName(request) },
        false,
        ['verify'],
      ),
    exportKeys: async (keys) => {
      const raw = await crypto.subtle.exportKey('raw', keys as CryptoKey)
      const serialized = bytesToHex(raw)
      return { public: serialized, private: serialized }
    },
    signAlgorithm: () => ({ name: 'HMAC' }),
  })
}

export function createWebCryptoProviders(): Record<AlgorithmId, CryptoProvider> {
  return {
    DIGEST: createDigestProvider(),
    'AES-CBC': createSymmetricProvider({
      name: 'AES-CBC',
      buildParams: (iv) => ({ name: 'AES-CBC', iv }),
    }),
    'AES-CTR': createSymmetricProvider({
      name: 'AES-CTR',
      buildParams: (iv) => ({ name: 'AES-CTR', counter: iv, length: 128 }),
    }),
    'AES-GCM': createSymmetricProvider({
      name: 'AES-GCM',
      buildParams: (iv) => ({ name: 'AES-GCM', iv }),
    }),
    'RSA-OAEP': createRsaOaepProvider(),
    'RSASSA-PKCS1-v1_5': rsaSignatureProvider('RSASSA-PKCS1-v1_5'),
    'RSA-PSS': rsaSignatureProvider('RSA-PSS'),
    ECDSA: ecdsaProvider(),
    HMAC: hmacProvider(),
  }
}
