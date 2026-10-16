<template>
  <v-container class="text-center container-fluid-md">
    <v-row>
      <!-- Горизонтальный степпер тура: показывается только при включённом
           туре (кнопка в верхней панели). -->
      <TourParams />
    </v-row>

    <v-row class="d-flex flex-row flex-wrap flex-lg-nowrap justify-space-around">
      <v-col cols="12" lg="4">
        <AlgorithmSelect
          v-model="algorithm"
          :items="algorithmItems"
          :label="t('select.algorithm')"
          @update:model-value="algorithmReset"
        />
      </v-col>
      <v-col cols="12" md="6" lg="4">
        <BaseSelect
          v-model="method"
          :items="currentAlgorithm.methods"
          :disabled="!currentAlgorithm.methods.length"
          :label="t('select.method')"
        />
      </v-col>
      <v-col cols="12" md="6" lg="4">
        <BaseSelect
          v-model="length"
          :items="currentAlgorithm.lengths"
          :disabled="!currentAlgorithm.lengths.length"
          :label="t('select.length')"
        />
      </v-col>
    </v-row>
    <v-row class="d-flex flex-row flex-wrap flex-md-nowrap justify-space-around">
      <!-- Левый таймлайн тура (шаги 6–4): рендерится компонентом
           TourTimeline на месте, поэтому остаётся прямым соседом колонки
           формы. -->
      <TourTimeline section="sender" />

      <!-- Без тура колонки таймлайна исчезают, поэтому форма-колонки
           расширяются на освободившееся место (5 → 6 на md). -->
      <v-col
        :cols="tourActive ? 11 : 12"
        :md="tourActive ? 5 : 6"
        class="form-column form-column--sender d-flex flex-nowrap"
      >
        <div class="text-right">
          <FormFieldAction
            :action-icon="mdiLockOutline"
            :action-text="t('action.encrypt')"
            :loading="isEncrypting"
            @click="encrypt"
          />
          <FormField
            v-model="code"
            :label="t('field.encryption')"
            @update:focused="onFieldFocus('code', $event)"
          />
        </div>
        <div ref="publicEl" class="text-right">
          <!-- Асимметричные алгоритмы (inverted): ключи меняются местами
               через Teleport — приватный ключ уезжает в колонку отправителя. -->
          <Teleport v-if="isMounted" :to="privateTarget" :disabled="!currentAlgorithm.inverted">
            <div>
              <FormFieldAction
                :disabled="!currentAlgorithm.canGenerate"
                :action-icon="mdiKey"
                :action-text="t('action.generate')"
                :loading="isGenerating"
                @click="generateKeys"
              />
              <FormField
                v-model="publicKey"
                :disabled="!currentAlgorithm.canGenerate"
                :label="t('field.publicKey')"
                @update:focused="onFieldFocus('public', $event)"
              />
            </div>
          </Teleport>
        </div>
        <div class="text-right">
          <div class="py-6"></div>
          <FormField
            v-model="sender"
            :label="t('field.sender')"
            @update:focused="onFieldFocus('sender', $event)"
          />
        </div>
      </v-col>
      <v-col
        :cols="tourActive ? 11 : 12"
        :md="tourActive ? 5 : 6"
        class="form-column form-column--recipient d-flex flex-nowrap"
      >
        <div class="text-right">
          <FormFieldAction :action-icon="mdiEmail" :action-text="t('action.get')" @click="send" />
          <FormField
            v-model="recipient"
            :label="t('field.recipient')"
            @update:focused="onFieldFocus('recipient', $event)"
          />
        </div>
        <div ref="privateEl" class="text-right">
          <Teleport v-if="isMounted" :to="publicTarget" :disabled="!currentAlgorithm.inverted">
            <div>
              <FormFieldAction
                :disabled="!currentAlgorithm.canGenerate"
                :action-icon="mdiKey"
                :action-text="t('action.generate')"
                :loading="isGenerating"
                @click="generateKeys"
              />
              <FormField
                v-model="privateKey"
                :disabled="!currentAlgorithm.canGenerate"
                :label="t('field.privateKey')"
                @update:focused="onFieldFocus('private', $event)"
              />
            </div>
          </Teleport>
        </div>
        <div class="text-right">
          <FormFieldAction
            :action-icon="mdiLockOpenOutline"
            :action-text="t('action.decrypt')"
            :loading="isDecrypting"
            @click="decrypt"
          />
          <FormField
            v-model="decode"
            :status="verifyStatus ?? undefined"
            :label="t('field.verification')"
            @update:focused="onFieldFocus('decode', $event)"
          />
        </div>
      </v-col>

      <!-- Правый таймлайн тура (шаги 7–9). -->
      <TourTimeline section="recipient" />
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { RendererElement } from 'vue'

import { useAsyncState, useMounted } from '@vueuse/core'

import { mdiEmail, mdiKey, mdiLockOpenOutline, mdiLockOutline } from '@mdi/js'
import { useI18n } from 'vue-i18n'

import AlgorithmSelect from '@/components/AlgorithmSelect.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import FormField from '@/components/FormField.vue'
import FormFieldAction from '@/components/FormFieldAction.vue'
import TourParams from '@/components/TourParams.vue'
import TourTimeline from '@/components/TourTimeline.vue'
import { useTour } from '@/composables/useTour'
import { createWebCryptoProviders, resolveProvider } from '@/crypto'
import { ALGORITHM_ITEMS } from '@/domain/algorithms'
import { useCryptoForm } from '@/domain/formModel'

const { t } = useI18n({ useScope: 'global' })
const { tourActive, registerTourSource } = useTour()

/* Пункты селекта алгоритмов приходят из доменного справочника. */
const algorithmItems = ALGORITHM_ITEMS

/* Состояние формы и правила сброса — в доменном слое. */
const {
  algorithm,
  method,
  length,
  sender,
  recipient,
  publicKey,
  privateKey,
  code,
  decode,
  verifyStatus,
  currentAlgorithm,
  snapshot,
  onFieldFocus,
  algorithmReset,
  send,
} = useCryptoForm()

/* useMounted вместо ref(false) + onMounted: ref становится true сразу
   после монтирования (нужен Teleport — цели существуют только в DOM). */
const isMounted = useMounted()

const publicEl = ref<HTMLElement | null>(null)
const privateEl = ref<HTMLElement | null>(null)

/* Телепорт требует RendererElement; к моменту v-if="isMounted"
   оба целевых контейнера уже в DOM, поэтому null невозможен. */
const publicTarget = computed(() => publicEl.value as RendererElement)
const privateTarget = computed(() => privateEl.value as RendererElement)

/* Регистрируем снимок состояния формы для тура: компоненты Tour читают
   его через useTour и вычисляют сквозной прогресс шагов 1–9 в одном
   месте, а рабочая область остаётся только источником данных. */
registerTourSource(() => snapshot.value)

/* Криптослой не знает о Vue и i18n: workspace передаёт ему снимок формы. */
const providers = createWebCryptoProviders()

function errorText(error: unknown): string {
  return `[Error] ${error instanceof Error ? error.message : String(error)}`
}

/* Состояние формы для операции: провайдер получает значения, а не ссылки. */
function request() {
  return {
    sender: sender.value,
    recipient: recipient.value,
    publicKey: publicKey.value,
    privateKey: privateKey.value,
    method: method.value ?? currentAlgorithm.value.methods[0],
    length: length.value ?? currentAlgorithm.value.lengths[0],
  }
}

/* Криптографические операции обёрнуты в useAsyncState: каждая получает
   реактивный флаг isLoading для индикации загрузки на кнопках
   (FormFieldAction :loading), выполняется лениво (immediate: false) и
   сбрасывает результат перед новым запуском (resetOnExecute: false —
   значения полей перезаписываются вручную, включая ошибки). */

const { execute: runGenerateKeys, isLoading: isGenerating } = useAsyncState(
  async (formRequest: ReturnType<typeof request>) => {
    const provider = resolveProvider(providers, algorithm.value)
    if (!provider?.generateKeys) return

    const keys = await provider.generateKeys(formRequest)
    publicKey.value = keys.public
    privateKey.value = keys.private
  },
  undefined,
  {
    immediate: false,
    resetOnExecute: false,
    onError: (error) => {
      publicKey.value = errorText(error)
      privateKey.value = errorText(error)
    },
  },
)

const { execute: runEncrypt, isLoading: isEncrypting } = useAsyncState(
  async (formRequest: ReturnType<typeof request>) => {
    const provider = resolveProvider(providers, algorithm.value)
    if (!provider) return

    const result = await provider.encrypt(formRequest)
    code.value = result.output
  },
  undefined,
  {
    immediate: false,
    resetOnExecute: false,
    onError: (error) => {
      code.value = errorText(error)
    },
  },
)

const { execute: runDecrypt, isLoading: isDecrypting } = useAsyncState(
  async (formRequest: ReturnType<typeof request>) => {
    const provider = resolveProvider(providers, algorithm.value)
    if (!provider) return

    const result = await provider.decrypt(formRequest)
    decode.value = result.output
    verifyStatus.value = result.verifyStatus ?? null
  },
  undefined,
  {
    immediate: false,
    resetOnExecute: false,
    onError: (error) => {
      decode.value = errorText(error)
      verifyStatus.value = false
    },
  },
)

async function generateKeys() {
  const provider = resolveProvider(providers, algorithm.value)
  if (!provider?.generateKeys) return

  await runGenerateKeys(0, request())
}

async function encrypt() {
  const provider = resolveProvider(providers, algorithm.value)
  if (!provider) return

  await runEncrypt(0, request())
}

async function decrypt() {
  const provider = resolveProvider(providers, algorithm.value)
  if (!provider) return

  await runDecrypt(0, request())
}
</script>

<style>
/* Направление колонок задаём в CSS, а не утилитой flex-column: на мобайле
   колонку отправителя нужно разворачивать, а утилита задаёт !important. */
.form-column {
  flex-direction: column;
}

/* На планшете убираем боковые поля: разрешаем контейнеру занимать всю ширину.
   На десктопе (lg, >=1280px) сохраняется исходный max-width: 1200px. */
@media (min-width: 960px) and (max-width: 1279.98px) {
  .v-container.container-fluid-md {
    max-width: 100%;
  }
}

/* На мобайле колонка отправителя разворачивается: «Отправитель» вверху, ниже
   «Публичный ключ» и «Шифрование». Колонка полей прижата к низу
   (column-reverse), таймлайн тура — к верху (его разворачивает
   TourTimeline.vue).
   Компенсируем разницу: 60px внизу минус 12px у таймлайна = сдвиг 48px,
   при котором иконка совпадает по уровню с плейсхолдером поля. */
@media (max-width: 599.98px) {
  .form-column--sender {
    flex-direction: column-reverse;
    padding-bottom: 60px;
  }
}
</style>
