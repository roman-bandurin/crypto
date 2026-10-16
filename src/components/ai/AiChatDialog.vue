<template>
  <!-- Плавающее окно AI-чата: bottom sheet на мобиле, прижатый справа
       компактный dialog на десктопе. Активируется кнопкой FAB (Alt+A). -->
  <v-dialog
    v-model="isOpen"
    class="ai-chat-dialog"
    content-class="ai-chat-dialog__content"
    max-width="560"
    scrollable
  >
    <v-card class="d-flex flex-column" height="70vh">
      <!-- Шапка: название, статус WebMCP, настройки, очистка -->
      <v-toolbar color="primary" density="comfortable">
        <v-icon :icon="mdiRobotOutline" class="ml-3" />
        <v-toolbar-title class="text-subtitle-1">{{ t('ai.title') }}</v-toolbar-title>

        <v-chip
          v-if="webMcp.registered > 0"
          class="mr-2"
          color="success"
          size="x-small"
          variant="tonal"
        >
          WebMCP {{ webMcp.registered }}
        </v-chip>

        <v-tooltip :text="t('ai.settings')" location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              :icon="mdiCogOutline"
              @click="settingsOpen = !settingsOpen"
            />
          </template>
        </v-tooltip>

        <v-tooltip :text="t('ai.clear')" location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn v-bind="tooltipProps" :icon="mdiDeleteOutline" @click="clearHistory" />
          </template>
        </v-tooltip>

        <v-tooltip :text="t('ai.close')" location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn v-bind="tooltipProps" :icon="mdiClose" @click="isOpen = false" />
          </template>
        </v-tooltip>
      </v-toolbar>

      <!-- Панель настроек: base URL, ключ, модель -->
      <v-expand-transition>
        <div v-if="settingsOpen" class="pa-4">
          <v-select
            v-model="config.preset.value"
            :items="presetItems"
            :label="t('ai.preset')"
            density="compact"
            variant="outlined"
            @update:model-value="applyPreset"
          />
          <v-text-field
            v-model="config.baseUrl.value"
            :label="t('ai.baseUrl')"
            density="compact"
            variant="outlined"
            placeholder="http://localhost:1234/v1"
          />
          <v-text-field
            v-model="config.apiKey.value"
            :label="t('ai.apiKey')"
            density="compact"
            variant="outlined"
            :type="showKey ? 'text' : 'password'"
            :append-inner-icon="showKey ? mdiEyeOff : mdiEye"
            @click:append-inner="showKey = !showKey"
          />
          <div class="d-flex align-center gap-2">
            <v-combobox
              v-model="config.model.value"
              :items="models"
              :label="t('ai.model')"
              :loading="isLoadingModels"
              density="compact"
              variant="outlined"
              class="flex-grow-1"
            />
            <v-btn
              :icon="mdiRefresh"
              :loading="isLoadingModels"
              :disabled="!baseUrlValid"
              variant="text"
              @click="loadModels"
            />
          </div>
          <v-alert v-if="configError" type="warning" density="compact" variant="tonal">
            {{ configError }}
          </v-alert>
        </div>
      </v-expand-transition>

      <!-- Лента сообщений -->
      <v-card-text ref="scrollTarget" class="flex-grow-1 overflow-y-auto">
        <div v-if="messages.length === 0" class="text-center py-6">
          <v-icon :icon="mdiRobotHappyOutline" size="48" class="mb-3" color="primary" />
          <p class="text-body-2 text-medium-emphasis mb-4">{{ t('ai.empty') }}</p>
          <v-chip-group class="justify-center">
            <v-chip
              v-for="prompt in quickPrompts"
              :key="prompt"
              size="small"
              variant="tonal"
              @click="sendPrompt(prompt)"
            >
              {{ prompt }}
            </v-chip>
          </v-chip-group>
        </div>

        <template v-for="(message, index) in messages" :key="index">
          <!-- Сообщение пользователя: справа, primary -->
          <div v-if="message.role === 'user'" class="d-flex justify-end mb-2">
            <v-sheet class="pa-3 rounded-lg" color="primary" max-width="85%">
              <span class="text-body-2 text-white" style="white-space: pre-wrap">{{
                message.content
              }}</span>
            </v-sheet>
          </div>

          <!-- Сообщение ассистента: слева, surface -->
          <div v-else class="d-flex justify-start mb-2">
            <v-sheet class="pa-3 rounded-lg" color="surface-variant" max-width="85%">
              <span class="text-body-2" style="white-space: pre-wrap">{{ message.content }}</span>

              <!-- Карточки вызова инструментов -->
              <v-card
                v-for="(record, recordIndex) in message.toolResults ?? []"
                :key="recordIndex"
                class="mt-2"
                :color="record.error ? 'error' : 'success'"
                density="compact"
                variant="tonal"
              >
                <v-card-item class="py-2">
                  <template #prepend>
                    <v-icon
                      :icon="record.error ? mdiAlertCircleOutline : mdiLockCheckOutline"
                      size="small"
                    />
                  </template>
                  <v-card-title class="text-caption">{{ record.tool }}</v-card-title>
                </v-card-item>
                <v-expansion-panels variant="accordion" class="px-2 pb-2">
                  <v-expansion-panel>
                    <v-expansion-panel-title class="text-caption">
                      {{ t('ai.toolDetails') }}
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <pre
                        class="text-caption overflow-x-auto"
                      ><code>{{ JSON.stringify(record.error ?? record.result, null, 2) }}</code></pre>
                      <v-btn
                        v-if="record.result.output"
                        size="x-small"
                        variant="text"
                        :icon="mdiContentCopy"
                        @click="copyOutput(record.result.output)"
                      />
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-card>
            </v-sheet>
          </div>
        </template>

        <div v-if="isLoading" class="d-flex justify-center py-2">
          <v-progress-linear
            indeterminate
            color="primary"
            class="rounded"
            style="max-width: 200px"
          />
        </div>
      </v-card-text>

      <!-- Ввод: Enter отправляет, Shift+Enter — перенос -->
      <v-divider />
      <v-card-actions class="pa-2 align-end">
        <v-textarea
          v-model="draft"
          :label="t('ai.input')"
          :disabled="isLoading"
          auto-grow
          rows="1"
          max-rows="4"
          variant="outlined"
          density="compact"
          hide-details
          @keydown.enter.exact.prevent="sendMessage"
        />
        <v-btn
          :icon="mdiSend"
          :loading="isLoading"
          :disabled="draft.trim().length === 0"
          color="primary"
          class="mb-1"
          @click="sendMessage"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import { useClipboard } from '@vueuse/core'

import { useHotkey } from 'vuetify'

import {
  mdiAlertCircleOutline,
  mdiClose,
  mdiCogOutline,
  mdiContentCopy,
  mdiDeleteOutline,
  mdiEye,
  mdiEyeOff,
  mdiLockCheckOutline,
  mdiRefresh,
  mdiRobotHappyOutline,
  mdiRobotOutline,
  mdiSend,
} from '@mdi/js'
import { useI18n } from 'vue-i18n'

import type { ChatMessage } from '@/agent/llmClient'
import { sendChatMessage } from '@/agent/llmClient'
import type { ToolResult } from '@/agent/toolRegistry'
import { createAgentTools } from '@/agent/toolRegistry'
import type { AiPresetId } from '@/agent/useAiConfig'
import { AI_PRESETS, fetchModels, isConfigReady, useAiConfig } from '@/agent/useAiConfig'
import type { WebMcpStatus } from '@/agent/webmcp'
import { isWebMcpSupported } from '@/agent/webmcp'

const { t } = useI18n({ useScope: 'global' })

/** Открытие окна: управляется AppLayout через модель. */
const isOpen = defineModel<boolean>({ required: true })

const config = useAiConfig()
const ready = isConfigReady(config)

/* --- Инструменты и статус WebMCP ------------------------------------ */
const tools = createAgentTools()
const webMcp = ref<WebMcpStatus>({ supported: isWebMcpSupported(), registered: 0 })

/* --- Состояние чата -------------------------------------------------- */
const messages = ref<ChatMessage[]>([])
const draft = ref('')
const isLoading = ref(false)

const quickPrompts = computed(() => [
  t('ai.prompt.digest'),
  t('ai.prompt.encrypt'),
  t('ai.prompt.sign'),
])

/* --- Настройки ------------------------------------------------------- */
const settingsOpen = ref(false)
const showKey = ref(false)
const models = ref<string[]>([])
const isLoadingModels = ref(false)
const configError = ref<string | null>(null)

const presetItems = computed(() => [
  ...AI_PRESETS.map((preset) => ({ title: preset.label, value: preset.id })),
  { title: 'Custom', value: 'custom' },
])

/** Пресет подставляет base URL и сбрасывает ключ/модель. */
function applyPreset(presetId: AiPresetId) {
  const preset = AI_PRESETS.find((item) => item.id === presetId)
  if (!preset) return
  config.baseUrl.value = preset.baseUrl
  config.apiKey.value = preset.requiresKey ? '' : 'lm-studio'
  config.model.value = ''
  void loadModels()
}

/** Загружает список моделей с настроенного эндпоинта. */
async function loadModels() {
  isLoadingModels.value = true
  configError.value = null
  try {
    models.value = (await fetchModels(config)).map((model) => model.id)
  } catch (error) {
    configError.value = error instanceof Error ? error.message : String(error)
  } finally {
    isLoadingModels.value = false
  }
}

const baseUrlValid = computed(() => /^https?:\/\//.test(config.baseUrl.value.trim()))

/* При первом открытии окна подтягиваем модели, если выбран эндпоинт. */
watch(isOpen, (open) => {
  if (open && models.value.length === 0 && baseUrlValid.value) {
    void loadModels()
  }
})

/* --- Отправка -------------------------------------------------------- */
async function sendMessage() {
  const text = draft.value.trim()
  if (text.length === 0 || isLoading.value) return

  if (!ready.value) {
    configError.value = t('ai.error.notConfigured')
    settingsOpen.value = true
    return
  }

  draft.value = ''
  isLoading.value = true
  configError.value = null

  try {
    const turn = await sendChatMessage(config, tools, messages.value, text)
    messages.value.push({ role: 'user', content: text })
    messages.value.push({
      role: 'assistant',
      content: turn.content,
      toolResults: turn.toolResults,
    })
  } catch (error) {
    messages.value.push({ role: 'user', content: text })
    messages.value.push({
      role: 'assistant',
      content: t('ai.error.request') + (error instanceof Error ? `\n${error.message}` : ''),
    })
    // Частая причина на HTTPS-странице — CORS локального LM Studio.
    if (!config.baseUrl.value.trim().startsWith('https://')) {
      configError.value = t('ai.error.cors')
    }
  } finally {
    isLoading.value = false
    await scrollToBottom()
  }
}

/** Отправка быстрого промпта из чипов. */
function sendPrompt(prompt: string) {
  draft.value = prompt
  void sendMessage()
}

/** Очистка истории диалога. */
function clearHistory() {
  messages.value = []
}

/* --- Скролл и буфер обмена ------------------------------------------- */
const scrollTarget = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  scrollTarget.value?.scrollTo({ top: scrollTarget.value.scrollHeight, behavior: 'smooth' })
}

const { copy } = useClipboard()

/** Копирует результат инструмента в буфер обмена. */
async function copyOutput(output: ToolResult['output']) {
  await copy(output)
}

/* Горячая клавиша: Alt+A открывает/закрывает чат. */
useHotkey('alt+a', () => {
  isOpen.value = !isOpen.value
})
</script>

<style scoped>
.ai-chat-dialog__content {
  align-self: flex-end;
}

/* На десктопе диалог прижимается вправо, как компактная панель. */
@media (min-width: 960px) {
  .ai-chat-dialog :deep(.v-overlay__content) {
    justify-content: flex-end;
    align-items: flex-end;
    padding-bottom: 24px;
  }
}
</style>
