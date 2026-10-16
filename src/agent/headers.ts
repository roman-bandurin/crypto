/**
 * agent/headers.ts
 *
 * Заголовки авторизации для запросов к [OI]-совместимому эндпоинту.
 * Выделен отдельно, чтобы тесты llmClient могли мокать конфиг без
 * localStorage (useLocalStorage требует браузерное окружение).
 */

import type { AiConfig } from '@/agent/useAiConfig'

/** Заголовки запроса: Authorization только при непустом ключе. */
export function buildAuthHeaders(config: AiConfig): Record<string, string> {
  const key = config.apiKey.value.trim()
  return key.length > 0 ? { Authorization: `Bearer ${key}` } : {}
}
