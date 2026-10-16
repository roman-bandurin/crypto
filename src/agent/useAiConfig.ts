/**
 * agent/useAiConfig.ts
 *
 * Реактивные настройки AI-чата: base URL, API-ключ и модель.
 * Всё сохраняется в localStorage через useLocalStorage (@vueuse/core),
 * ничего не покидает браузер, кроме запросов к выбранному эндпоинту.
 */

import { computed } from 'vue'

import { useLocalStorage } from '@vueuse/core'

/** Пресеты OpenAI-совместимых эндпоинтов. */
export const AI_PRESETS = [
  { id: 'lm-studio', label: 'LM Studio', baseUrl: 'http://localhost:1234/v1', requiresKey: false },
  { id: 'ollama', label: 'Ollama', baseUrl: 'http://localhost:11434/v1', requiresKey: false },
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', requiresKey: true },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresKey: true,
  },
] as const

export type AiPresetId = (typeof AI_PRESETS)[number]['id'] | 'custom'

const DEFAULT_BASE_URL = AI_PRESETS[0].baseUrl
/** LM Studio принимает любой непустой ключ; по умолчанию — 'lm-studio'. */
const DEFAULT_API_KEY = 'lm-studio'
const DEFAULT_MODEL = ''

export interface AiConfig {
  preset: ReturnType<typeof useLocalStorage<AiPresetId>>
  baseUrl: ReturnType<typeof useLocalStorage<string>>
  apiKey: ReturnType<typeof useLocalStorage<string>>
  model: ReturnType<typeof useLocalStorage<string>>
}

/** Синглтон-состояние настроек: единое на всё приложение. */
let instance: AiConfig | undefined

/** Доступ к настройкам чата. Все поля реактивны и персистентны. */
export function useAiConfig(): AiConfig {
  if (!instance) {
    instance = {
      preset: useLocalStorage<AiPresetId>('ai.preset', 'lm-studio'),
      baseUrl: useLocalStorage<string>('ai.baseUrl', DEFAULT_BASE_URL),
      apiKey: useLocalStorage<string>('ai.apiKey', DEFAULT_API_KEY),
      model: useLocalStorage<string>('ai.model', DEFAULT_MODEL),
    }
  }
  return instance
}

/** Список моделей: { id } из GET {baseUrl}/models. */
export interface AiModel {
  id: string
}

/** Загружает список моделей с настроенного эндпоинта. */
export async function fetchModels(config: AiConfig): Promise<AiModel[]> {
  const url = `${config.baseUrl.value.replace(/\/+$/, '')}/models`
  const response = await fetch(url, {
    headers: buildHeaders(config),
  })
  if (!response.ok) {
    throw new Error(`GET /models: HTTP ${response.status}`)
  }
  const body: unknown = await response.json()
  const data = (body as { data?: unknown }).data
  if (!Array.isArray(data)) return []
  return data
    .map((entry) => (entry as { id?: unknown }).id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .map((id) => ({ id }))
}

/** Заголовки запроса: Authorization только при непустом ключе. */
function buildHeaders(config: AiConfig): HeadersInit {
  const key = config.apiKey.value.trim()
  return key.length > 0 ? { Authorization: `Bearer ${key}` } : {}
}

/** Валиден ли текущий конфиг для отправки запросов. */
export function isConfigReady(config: AiConfig) {
  return computed(() => {
    const baseUrl = config.baseUrl.value.trim()
    return /^https?:\/\//.test(baseUrl) && config.model.value.trim().length > 0
  })
}

/** Сброс настроек к значениям пресета LM Studio. */
export function resetAiConfig(config: AiConfig): void {
  config.preset.value = 'lm-studio'
  config.baseUrl.value = DEFAULT_BASE_URL
  config.apiKey.value = DEFAULT_API_KEY
  config.model.value = DEFAULT_MODEL
}
