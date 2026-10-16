/**
 * agent/toolRegistry.ts
 *
 * Единый реестр инструментов для AI-агентов.
 *
 * Каждая запись описывает { name, description, inputSchema, annotations,
 * execute } — формат, совместимый одновременно с:
 *   - W3C WebMCP (navigator.modelContext.provideContext({ tools })),
 *   - OpenAI function calling (tools / tool_calls в /v1/chat/completions).
 *
 * Реестр зависит только от криптослоя (crypto/index.ts) и доменного
 * справочника (domain/algorithms.ts): никаких Vue и i18n.
 */

import type { AlgorithmId } from '@/domain/algorithm'
import { ALGORITHM_CONFIGS } from '@/domain/algorithms'
import type { CryptoProviderMap, CryptoRequest } from '@/crypto'
import { createWebCryptoProviders, resolveProvider } from '@/crypto'

/* ------------------------------------------------------------------ */
/* Типы                                                                */
/* ------------------------------------------------------------------ */

/** JSON Schema аргументов инструмента (упрощённое структурное подмножество). */
export type JsonSchema = Record<string, unknown>

/** Аннотации MCP: сигналы безопасности для клиента агента. */
export interface ToolAnnotations {
  readOnlyHint: boolean
  destructiveHint: boolean
  idempotentHint: boolean
  openWorldHint: boolean
}

/** Структурированный результат выполнения инструмента. */
export interface ToolResult {
  output: string
  /** Сгенерированные ключи (hex), если создавались. */
  publicKey?: string
  privateKey?: string
  /** Результат проверки подписи/MAC. */
  verifyStatus?: boolean
}

/** Инструмент агента: дескриптор + исполняемый обработчик. */
export interface AgentTool {
  name: string
  description: string
  inputSchema: JsonSchema
  annotations: ToolAnnotations
  execute: (args: Record<string, unknown>) => Promise<ToolResult>
}

/* ------------------------------------------------------------------ */
/* Валидация аргументов                                                */
/* ------------------------------------------------------------------ */

/** Алгоритмы, доступные инструментам (все записи ALGORITHM_CONFIGS). */
const ALGORITHM_IDS = Object.keys(ALGORITHM_CONFIGS) as AlgorithmId[]

const METHOD_IDS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const
type MethodId = (typeof METHOD_IDS)[number]

/** Строгая ошибка выполнения: текст уходит агенту в содержимое tool-ответа. */
class ToolInputError extends Error {}

function isAlgorithm(value: unknown): value is AlgorithmId {
  return typeof value === 'string' && (ALGORITHM_IDS as string[]).includes(value)
}

/** Безопасное строковое представление аргумента для сообщений об ошибках. */
function display(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function isMethod(value: unknown): value is MethodId {
  return typeof value === 'string' && (METHOD_IDS as readonly string[]).includes(value)
}

/** Требуемый строковый аргумент. */
function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new ToolInputError(`требуется непустой строковый аргумент "${key}"`)
  }
  return value
}

/** Опциональный метод хеша; undefined — использовать метод по умолчанию. */
function optionalMethod(args: Record<string, unknown>): MethodId | undefined {
  const value = args.method
  if (value === undefined || value === null) return undefined
  if (!isMethod(value)) {
    throw new ToolInputError(
      `метод "${display(value)}" не поддерживается; допустимы: ${METHOD_IDS.join(', ')}`,
    )
  }
  return value
}

/** Опциональная длина ключа. */
function optionalLength(args: Record<string, unknown>): number | undefined {
  const value = args.length
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new ToolInputError(
      `аргумент "length" должен быть целым числом бит, получено: ${display(value)}`,
    )
  }
  return value
}

/* ------------------------------------------------------------------ */
/* Сборка CryptoRequest из аргументов инструмента                      */
/* ------------------------------------------------------------------ */

interface RequestBuildOptions {
  algorithm: AlgorithmId
  method?: MethodId | undefined
  length?: number | undefined
  text?: string
  recipient?: string
  publicKey?: string
  privateKey?: string
}

function buildRequest(options: RequestBuildOptions): CryptoRequest {
  const config = ALGORITHM_CONFIGS[options.algorithm]
  return {
    sender: options.text ?? '',
    recipient: options.recipient ?? '',
    publicKey: options.publicKey ?? '',
    privateKey: options.privateKey ?? '',
    method: options.method ?? (config.methods.length > 0 ? config.methods[0] : undefined),
    length: options.length ?? (config.lengths.length > 0 ? config.lengths[0] : undefined),
  }
}

/* ------------------------------------------------------------------ */
/* Реестр инструментов                                                 */
/* ------------------------------------------------------------------ */

const readOnly: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
}

/**
 * Фабрика реестра: создаёт инструменты поверх свежей фабрики провайдеров.
 * Отдельная функция (а не константный массив) позволяет тестам создавать
 * изолированные экземпляры.
 */
export function createAgentTools(
  providers: CryptoProviderMap = createWebCryptoProviders(),
): AgentTool[] {
  return [
    {
      name: 'list_algorithms',
      description:
        'List all supported cryptographic algorithms with their hash methods, key lengths, key-generation capability and inverted-key flag (private key on the sender side for signatures).',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: readOnly,
      async execute() {
        // Синхронная сборка каталога; await сохраняет асинхронный контракт.
        const algorithms = await Promise.resolve(
          Object.fromEntries(
            (Object.keys(ALGORITHM_CONFIGS) as AlgorithmId[]).map((id) => {
              const config = ALGORITHM_CONFIGS[id]
              return [
                id,
                {
                  methods: config.methods,
                  lengths: config.lengths,
                  canGenerate: config.canGenerate,
                  inverted: config.inverted,
                },
              ]
            }),
          ),
        )
        return { output: JSON.stringify(algorithms, null, 2) }
      },
    },

    {
      name: 'compute_digest',
      description:
        'Compute a cryptographic digest (hash) of a UTF-8 text and return it as a lowercase hex string. Digest algorithms: SHA-1, SHA-256, SHA-384, SHA-512.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'UTF-8 text to hash' },
          method: {
            type: 'string',
            enum: [...METHOD_IDS],
            default: 'SHA-256',
            description: 'Hash function; defaults to SHA-256',
          },
        },
        required: ['text'],
        additionalProperties: false,
      },
      annotations: readOnly,
      async execute(args) {
        const provider = resolveProvider(providers, 'DIGEST')
        if (!provider) throw new ToolInputError('провайдер DIGEST недоступен')
        const request = buildRequest({
          algorithm: 'DIGEST',
          method: optionalMethod(args),
          text: requireString(args, 'text'),
        })
        const result = await provider.encrypt(request)
        return { output: result.output }
      },
    },

    {
      name: 'generate_keys',
      description:
        'Generate a symmetric key or a public/private key pair and return them as lowercase hex strings. Supported: AES-CBC, AES-CTR, AES-GCM (symmetric), RSA-OAEP, RSASSA-PKCS1-v1_5, RSA-PSS, ECDSA (asymmetric), HMAC.',
      inputSchema: {
        type: 'object',
        properties: {
          algorithm: {
            type: 'string',
            enum: ALGORITHM_IDS.filter((id) => id !== 'DIGEST'),
            description: 'Algorithm to generate keys for',
          },
          method: {
            type: 'string',
            enum: [...METHOD_IDS],
            description: 'Hash method (RSA/ECDSA/HMAC only)',
          },
          length: {
            type: 'integer',
            description: 'Key length in bits; defaults to the first configured length',
          },
        },
        required: ['algorithm'],
        additionalProperties: false,
      },
      annotations: readOnly,
      async execute(args) {
        const algorithm = args.algorithm
        if (!isAlgorithm(algorithm) || algorithm === 'DIGEST') {
          throw new ToolInputError(
            `алгоритм "${String(algorithm)}" не поддерживает генерацию ключей`,
          )
        }
        const provider = resolveProvider(providers, algorithm)
        if (!provider?.generateKeys) {
          throw new ToolInputError(`для алгоритма "${algorithm}" генерация ключей недоступна`)
        }
        const keys = await provider.generateKeys(
          buildRequest({
            algorithm,
            method: optionalMethod(args),
            length: optionalLength(args),
          }),
        )
        return { output: keys.public, publicKey: keys.public, privateKey: keys.private }
      },
    },

    {
      name: 'encrypt_or_sign',
      description:
        'Encrypt a text (AES-CBC, AES-CTR, AES-GCM, RSA-OAEP) or produce a digital signature / MAC (RSASSA-PKCS1-v1_5, RSA-PSS, ECDSA, HMAC). Returns a lowercase hex output. When "key" is omitted and autoGenerateKey is true, a fresh key/pair is generated and returned alongside the output.',
      inputSchema: {
        type: 'object',
        properties: {
          algorithm: { type: 'string', enum: [...ALGORITHM_IDS], description: 'Algorithm to use' },
          text: { type: 'string', description: 'Plaintext to encrypt or message to sign' },
          key: {
            type: 'string',
            description:
              'Hex key: public for RSA-OAEP encryption, private for signing/MAC; omit with autoGenerateKey=true',
          },
          method: {
            type: 'string',
            enum: [...METHOD_IDS],
            description: 'Hash method where applicable',
          },
          length: { type: 'integer', description: 'Key length in bits where applicable' },
          autoGenerateKey: {
            type: 'boolean',
            default: false,
            description: 'Generate a fresh key when "key" is omitted',
          },
        },
        required: ['algorithm', 'text'],
        additionalProperties: false,
      },
      annotations: readOnly,
      async execute(args) {
        const algorithm = args.algorithm
        if (!isAlgorithm(algorithm)) {
          throw new ToolInputError(
            `неизвестный алгоритм "${String(algorithm)}"; доступные: ${ALGORITHM_IDS.join(', ')}`,
          )
        }
        const provider = resolveProvider(providers, algorithm)
        if (!provider) throw new ToolInputError(`провайдер "${algorithm}" недоступен`)

        let publicKey = typeof args.key === 'string' ? args.key : ''
        let privateKey = typeof args.key === 'string' ? args.key : ''
        let generated: Awaited<ReturnType<NonNullable<typeof provider.generateKeys>>> | undefined

        // Ключ не передан: либо генерируем (если разрешено), либо ошибка.
        if (!publicKey) {
          if (args.autoGenerateKey === true && provider.generateKeys) {
            generated = await provider.generateKeys(
              buildRequest({
                algorithm,
                method: optionalMethod(args),
                length: optionalLength(args),
              }),
            )
            publicKey = generated.public
            privateKey = generated.private
          } else if (algorithm !== 'DIGEST') {
            throw new ToolInputError(
              'передайте hex-ключ в "key" или установите autoGenerateKey=true',
            )
          }
        }

        const result = await provider.encrypt(
          buildRequest({
            algorithm,
            method: optionalMethod(args),
            length: optionalLength(args),
            text: requireString(args, 'text'),
            publicKey,
            privateKey,
          }),
        )
        const output: ToolResult = { output: result.output }
        if (generated) {
          output.publicKey = generated.public
          output.privateKey = generated.private
        }
        return output
      },
    },

    {
      name: 'decrypt_or_verify',
      description:
        'Decrypt a hex ciphertext (AES-CBC, AES-CTR, AES-GCM, RSA-OAEP) or verify a digital signature / MAC (RSASSA-PKCS1-v1_5, RSA-PSS, ECDSA, HMAC). Decryption returns the plaintext; verification returns verifyStatus (true/false).',
      inputSchema: {
        type: 'object',
        properties: {
          algorithm: { type: 'string', enum: [...ALGORITHM_IDS], description: 'Algorithm to use' },
          ciphertextOrSignature: {
            type: 'string',
            description: 'Hex ciphertext (with IV prefix for AES) or hex signature/MAC',
          },
          key: {
            type: 'string',
            description: 'Hex key: private for decryption, public for verification',
          },
          originalText: {
            type: 'string',
            description: 'Original message; required for signature verification',
          },
          method: {
            type: 'string',
            enum: [...METHOD_IDS],
            description: 'Hash method where applicable',
          },
          length: { type: 'integer', description: 'Key length in bits where applicable' },
        },
        required: ['algorithm', 'ciphertextOrSignature', 'key'],
        additionalProperties: false,
      },
      annotations: readOnly,
      async execute(args) {
        const algorithm = args.algorithm
        if (!isAlgorithm(algorithm)) {
          throw new ToolInputError(
            `неизвестный алгоритм "${String(algorithm)}"; доступные: ${ALGORITHM_IDS.join(', ')}`,
          )
        }
        const provider = resolveProvider(providers, algorithm)
        if (!provider) throw new ToolInputError(`провайдер "${algorithm}" недоступен`)

        const ciphertext = requireString(args, 'ciphertextOrSignature')
        const key = requireString(args, 'key')
        const result = await provider.decrypt(
          buildRequest({
            algorithm,
            method: optionalMethod(args),
            length: optionalLength(args),
            text: typeof args.originalText === 'string' ? args.originalText : ciphertext,
            recipient: ciphertext,
            publicKey: key,
            privateKey: key,
          }),
        )
        const output: ToolResult =
          result.verifyStatus === undefined
            ? { output: result.output }
            : { output: result.output, verifyStatus: result.verifyStatus }
        return output
      },
    },
  ]
}

/** Реестр, пригодный для регистрации в WebMCP: только дескриптор + execute. */
export type WebMcpToolDescriptor = Pick<
  AgentTool,
  'name' | 'description' | 'inputSchema' | 'execute'
>
