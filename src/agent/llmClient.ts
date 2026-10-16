/**
 * agent/llmClient.ts
 *
 * [OI]-совместимый клиент чата с циклом выполнения инструментов.
 *
 * Двухуровневая поддержка tool calling:
 *   1. Нативный [OI] tools / tool_calls (LM Studio, Ollama, [OI]).
 *   2. Fallback: модель без нативного tool_calls возвращает в тексте
 *      JSON-блок {"tool": "...", "arguments": {...}} — парсер его
 *      распознаёт, инструмент выполняется, результат уходит модели.
 *
 * Клиент не знает о Vue: сообщения и результаты — простые структуры.
 */

import type { AgentTool, ToolResult } from '@/agent/toolRegistry'
import type { AiConfig } from '@/agent/useAiConfig'
import { buildAuthHeaders } from '@/agent/headers'

/** Сообщение истории чата. */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'system'
  content: string
  /** Карточки результатов вызова инструментов (для UI). */
  toolResults?: ToolCallRecord[]
}

/** Факт выполнения инструмента: сохраняется в сообщении для UI. */
export interface ToolCallRecord {
  tool: string
  args: Record<string, unknown>
  result: ToolResult
  error?: string
}

/** Структурированный вызов инструмента, извлечённый из ответа модели. */
interface ParsedToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

/** Ответ /v1/chat/completions (упрощённое структурное подмножество). */
interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      role?: string
      content?: string | null
      tool_calls?: Array<{
        id?: string
        type?: string
        function?: { name?: string; arguments?: string }
      }>
    }
  }>
}

const SYSTEM_PROMPT = [
  'You are an assistant embedded in a browser-based cryptographic playground.',
  'You can call client-side crypto tools: list_algorithms, compute_digest, generate_keys, encrypt_or_sign, decrypt_or_verify.',
  'Prefer calling tools over computing anything yourself.',
  'Never invent key material; use generate_keys.',
  'If your runtime lacks native tool calls, emit a fenced json block: {"tool": "<name>", "arguments": { ... }}.',
].join(' ')

/* ------------------------------------------------------------------ */
/* Парсинг вызовов инструментов                                        */
/* ------------------------------------------------------------------ */

/** Ищет нативные tool_calls в ответе. */
function parseNativeToolCalls(response: ChatCompletionResponse): ParsedToolCall[] {
  const message = response.choices?.[0]?.message
  const raw = message?.tool_calls
  if (!Array.isArray(raw)) return []

  return raw.flatMap((call, index) => {
    const name = call.function?.name
    if (typeof name !== 'string' || name.length === 0) return []
    let args: Record<string, unknown> = {}
    try {
      const parsed: unknown = call.function?.arguments ? JSON.parse(call.function.arguments) : {}
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        args = parsed as Record<string, unknown>
      }
    } catch {
      args = {}
    }
    return [{ id: call.id ?? `call_${index}`, name, arguments: args }]
  })
}

/** Ищет fallback JSON-блок ```json {"tool": ...}``` в тексте. */
function parseFallbackToolCall(content: string): ParsedToolCall | undefined {
  const fence = /```json\s*(\{[\s\S]*?\})\s*```/.exec(content)
  const candidate = fence?.[1]
  if (!candidate) return undefined
  try {
    const parsed: unknown = JSON.parse(candidate)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>
      const name = record.tool
      const args = record.arguments
      if (
        typeof name === 'string' &&
        args !== null &&
        typeof args === 'object' &&
        !Array.isArray(args)
      ) {
        return { id: 'fallback_0', name, arguments: args as Record<string, unknown> }
      }
    }
  } catch {
    return undefined
  }
  return undefined
}

/** Убирает fallback JSON-блок из текста, чтобы не показывать его пользователю. */
function stripFallbackBlock(content: string): string {
  return content.replace(/```json\s*\{\s*"tool"[\s\S]*?\}\s*```/, '').trim()
}

/* ------------------------------------------------------------------ */
/* Выполнение инструментов                                             */
/* ------------------------------------------------------------------ */

/** Выполняет один вызов инструмента, оборачивая ошибки в record. */
async function executeToolCall(
  toolMap: Map<string, AgentTool>,
  call: ParsedToolCall,
): Promise<ToolCallRecord> {
  const tool = toolMap.get(call.name)
  if (!tool) {
    return {
      tool: call.name,
      args: call.arguments,
      result: { output: '' },
      error: `неизвестный инструмент "${call.name}"`,
    }
  }
  try {
    const result = await tool.execute(call.arguments)
    return { tool: call.name, args: call.arguments, result }
  } catch (error) {
    return {
      tool: call.name,
      args: call.arguments,
      result: { output: '' },
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/* ------------------------------------------------------------------ */
/* Основной цикл чата                                                  */
/* ------------------------------------------------------------------ */

/** Ограничение цикла tool calling: защита от бесконечных петель. */
const MAX_TOOL_ROUNDS = 5

/** Итог одного запроса чата: текст ответа + выполненные инструменты. */
export interface ChatTurnResult {
  content: string
  toolResults: ToolCallRecord[]
  /** Число раундов tool calling. */
  rounds: number
}

/**
 * Отправляет историю чата на [OI]-совместимый эндпоинт и выполняет
 * цикл tool calling до финального текстового ответа.
 */
export async function sendChatMessage(
  config: AiConfig,
  tools: AgentTool[],
  history: ChatMessage[],
  userText: string,
): Promise<ChatTurnResult> {
  const toolMap = new Map(tools.map((tool) => [tool.name, tool]))
  const url = `${config.baseUrl.value.replace(/\/+$/, '')}/chat/completions`

  // Рабочая копия истории: начинается с системного промпта.
  const messages: Array<{ role: string; content: string; tool_call_id?: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({ role: message.role, content: message.content })),
    { role: 'user', content: userText },
  ]

  const toolSpecs = tools.map(({ name, description, inputSchema }) => ({
    type: 'function',
    function: { name, description, parameters: inputSchema },
  }))

  const executed: ToolCallRecord[] = []

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(config),
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model.value.trim(),
        messages,
        tools: toolSpecs,
        temperature: 0.2,
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(
        `chat/completions: HTTP ${response.status}${detail ? ` — ${detail.slice(0, 300)}` : ''}`,
      )
    }

    const body = (await response.json()) as ChatCompletionResponse
    const message = body.choices?.[0]?.message
    const rawContent = message?.content ?? ''
    const nativeCalls = parseNativeToolCalls(body)
    const fallbackCall = nativeCalls.length === 0 ? parseFallbackToolCall(rawContent) : undefined
    const calls = nativeCalls.length > 0 ? nativeCalls : fallbackCall ? [fallbackCall] : []

    if (calls.length === 0) {
      // Финальный текстовый ответ (fallback-блок уже вырезан, если был).
      return {
        content: stripFallbackBlock(rawContent) || rawContent,
        toolResults: executed,
        rounds: round,
      }
    }

    // Выполняем инструменты локально в браузере.
    const records: ToolCallRecord[] = []
    for (const call of calls) {
      const record = await executeToolCall(toolMap, call)
      records.push(record)
      executed.push(record)

      const toolContent = record.error
        ? `[Error] ${record.error}`
        : JSON.stringify(record.result, null, 2)
      messages.push({
        role: 'assistant',
        content: '',
      })
      // Результаты инструментов — отдельные role:'tool' сообщения
      // (настраиваемый tool_call_id нужен для строгих [OI]-серверов).
      messages.push({ role: 'tool', content: toolContent, tool_call_id: call.id })
    }
    // Убираем пустые assistant-сообщения: часть серверов их отвергает.
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === 'assistant' && messages[i]!.content === '') {
        messages.splice(i, 1)
      }
    }
    void records
  }

  return {
    content: '(tool loop limit reached — responses truncated)',
    toolResults: executed,
    rounds: MAX_TOOL_ROUNDS,
  }
}
