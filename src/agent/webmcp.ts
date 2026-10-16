/**
 * agent/webmcp.ts
 *
 * Регистрация инструментов в W3C WebMCP (navigator.modelContext).
 *
 * По спецификации API доступно не во всех браузерах (пока только
 * Chrome Canary за флагом), поэтому обязательна feature-detect:
 * при отсутствии API — тихий no-op, приложение продолжает работать
 * с собственным AI-чатом.
 */

import type { AgentTool } from '@/agent/toolRegistry'

/** Минимальный структурный контракт W3C WebMCP. */
interface ModelContext {
  provideContext?: (context: { tools: unknown[] }) => void | Promise<void>
  registerTool?: (tool: unknown) => void | Promise<void>
}

interface NavigatorWithModelContext {
  modelContext?: ModelContext
}

declare global {
  interface Navigator {
    modelContext?: ModelContext
  }
}

/** Состояние регистрации для UI-бейджа в чате. */
export interface WebMcpStatus {
  supported: boolean
  registered: number
}

/** Feature-detect: поддерживает ли браузер navigator.modelContext. */
export function isWebMcpSupported(): boolean {
  return typeof navigator !== 'undefined' && 'modelContext' in navigator
}

/**
 * Регистрирует инструменты реестра в браузере. Возвращает статус:
 * сколько инструментов фактически зарегистрировано. Ошибки регистрации
 * не должны ронять приложение — API ещё экспериментальное.
 */
export async function registerWebMcpTools(tools: AgentTool[]): Promise<WebMcpStatus> {
  if (!isWebMcpSupported()) {
    return { supported: false, registered: 0 }
  }

  const context = (navigator as NavigatorWithModelContext).modelContext
  if (!context) {
    return { supported: false, registered: 0 }
  }

  const descriptors = tools.map(({ name, description, inputSchema, execute }) => ({
    name,
    description,
    inputSchema,
    execute: async (args: Record<string, unknown>) => {
      try {
        const result = await execute(args)
        // Формат ответа WebMCP: { content: [{ type: 'text', text }] }.
        return { content: [{ type: 'text', text: result.output }] }
      } catch (error) {
        const text = error instanceof Error ? error.message : String(error)
        return { content: [{ type: 'text', text: `[Error] ${text}` }] }
      }
    },
  }))

  try {
    if (typeof context.provideContext === 'function') {
      await context.provideContext({ tools: descriptors })
    } else if (typeof context.registerTool === 'function') {
      for (const descriptor of descriptors) {
        await context.registerTool(descriptor)
      }
    } else {
      return { supported: false, registered: 0 }
    }
  } catch {
    // Экспериментальный API: сбой регистрации не критичен.
    return { supported: true, registered: 0 }
  }

  return { supported: true, registered: descriptors.length }
}
