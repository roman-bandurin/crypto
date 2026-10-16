/**
 * Тесты агентного слоя: реестр инструментов поверх Web Crypto
 * и feature-detect WebMCP.
 */
import { describe, expect, it, vi } from 'vite-plus/test'

import { createAgentTools } from '@/agent/toolRegistry'
import type { AgentTool } from '@/agent/toolRegistry'
import { registerWebMcpTools } from '@/agent/webmcp'

const tools: AgentTool[] = createAgentTools()
const byName = new Map(tools.map((tool) => [tool.name, tool]))

describe('agent/toolRegistry', () => {
  it('регистрирует ровно 5 инструментов с уникальными именами', () => {
    expect(tools.map((tool) => tool.name)).toEqual([
      'list_algorithms',
      'compute_digest',
      'generate_keys',
      'encrypt_or_sign',
      'decrypt_or_verify',
    ])
  })

  it('каждый инструмент имеет JSON Schema с type: object', () => {
    for (const tool of tools) {
      expect(tool.inputSchema.type, tool.name).toBe('object')
      expect(tool.description.length, tool.name).toBeGreaterThan(20)
      expect(tool.annotations.readOnlyHint, tool.name).toBe(true)
    }
  })

  describe('list_algorithms', () => {
    it('возвращает каталог алгоритмов', async () => {
      const result = await byName.get('list_algorithms')!.execute({})
      const catalog = JSON.parse(result.output) as Record<string, unknown>

      expect(catalog['DIGEST']).toBeDefined()
      expect(catalog['AES-GCM']).toBeDefined()
      expect(catalog['ECDSA']).toBeDefined()
      const ecdsa = catalog['ECDSA'] as { canGenerate: boolean; inverted: boolean }
      expect(ecdsa.canGenerate).toBe(true)
      expect(ecdsa.inverted).toBe(true)
    })
  })

  describe('compute_digest', () => {
    it('считает SHA-256 от "hello"', async () => {
      const result = await byName
        .get('compute_digest')!
        .execute({ text: 'hello', method: 'SHA-256' })
      expect(result.output).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
    })

    it('по умолчанию использует первый метод каталога (SHA-1)', async () => {
      const result = await byName.get('compute_digest')!.execute({ text: 'hello' })
      expect(result.output).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d')
    })

    it('падает без текста', async () => {
      await expect(byName.get('compute_digest')!.execute({})).rejects.toThrow(/text/)
    })
  })

  describe('generate_keys + encrypt_or_sign + decrypt_or_verify', () => {
    it('выполняет AES-GCM round-trip', async () => {
      const keys = await byName.get('generate_keys')!.execute({ algorithm: 'AES-GCM', length: 128 })
      expect(keys.publicKey).toMatch(/^[0-9a-f]{32}$/)

      const encrypted = await byName
        .get('encrypt_or_sign')!
        .execute({ algorithm: 'AES-GCM', text: 'secret', key: keys.publicKey })
      expect(encrypted.output).toMatch(/^[0-9a-f]+$/)

      const decrypted = await byName.get('decrypt_or_verify')!.execute({
        algorithm: 'AES-GCM',
        ciphertextOrSignature: encrypted.output,
        key: keys.privateKey,
      })
      expect(decrypted.output).toBe('secret')
    })

    it('autoGenerateKey генерирует ключ и возвращает его в результате', async () => {
      const result = await byName
        .get('encrypt_or_sign')!
        .execute({ algorithm: 'AES-CTR', text: 'msg', autoGenerateKey: true })
      expect(result.publicKey).toMatch(/^[0-9a-f]{32}$/)
      expect(result.privateKey).toBe(result.publicKey)
    })

    it('encrypt_or_sign без ключа и без autoGenerateKey падает', async () => {
      await expect(
        byName.get('encrypt_or_sign')!.execute({ algorithm: 'AES-CBC', text: 'x' }),
      ).rejects.toThrow(/key|autoGenerateKey/)
    })

    it('проверяет ECDSA-подпись (verifyStatus: true)', async () => {
      const keys = await byName.get('generate_keys')!.execute({ algorithm: 'ECDSA', length: 256 })
      const signature = await byName
        .get('encrypt_or_sign')!
        .execute({ algorithm: 'ECDSA', text: 'doc', key: keys.privateKey, method: 'SHA-256' })

      const verified = await byName.get('decrypt_or_verify')!.execute({
        algorithm: 'ECDSA',
        ciphertextOrSignature: signature.output,
        key: keys.publicKey,
        originalText: 'doc',
        method: 'SHA-256',
      })
      expect(verified.verifyStatus).toBe(true)
    })

    it('отвергает неизвестный алгоритм', async () => {
      await expect(
        byName.get('encrypt_or_sign')!.execute({ algorithm: 'ROT13', text: 'x' }),
      ).rejects.toThrow(/алгоритм/)
    })
  })
})

describe('agent/webmcp', () => {
  it('возвращает supported: false, когда navigator.modelContext отсутствует', async () => {
    const status = await registerWebMcpTools(tools)
    expect(status.supported).toBe(false)
    expect(status.registered).toBe(0)
  })

  it('регистрирует инструменты через provideContext при поддержке API', async () => {
    const provideContext = vi.fn()
    navigator.modelContext = { provideContext }

    const status = await registerWebMcpTools(tools)

    expect(status.supported).toBe(true)
    expect(status.registered).toBe(tools.length)
    expect(provideContext).toHaveBeenCalledTimes(1)
    const payload = provideContext.mock.calls[0]![0] as { tools: Array<{ name: string }> }
    expect(payload.tools).toHaveLength(tools.length)
    expect(payload.tools[0]!.name).toBe('list_algorithms')

    // Убираем мок, чтобы не влиять на другие тесты.
    delete (navigator as { modelContext?: unknown }).modelContext
  })

  it('execute-обёртка WebMCP возвращает { content: [{ type: "text" }] }', async () => {
    let captured: Array<{
      name: string
      execute: (args: Record<string, unknown>) => Promise<{ content: unknown[] }>
    }> = []
    const provideContext = vi.fn((context: { tools: typeof captured }) => {
      captured = context.tools
    })
    // @ts-expect-error — имитируем экспериментальный API
    navigator.modelContext = { provideContext }

    await registerWebMcpTools(tools)
    const response = await captured[1]!.execute({ text: 'hello', method: 'SHA-256' })

    expect(response.content).toEqual([
      { type: 'text', text: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824' },
    ])

    delete (navigator as { modelContext?: unknown }).modelContext
  })
})
