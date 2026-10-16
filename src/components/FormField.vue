<template>
  <v-textarea
    v-model="innerModelValue"
    :prepend-inner-icon="copied ? mdiCheck : mdiPencil"
    counter
    clearable
    auto-grow
    class="form-field-input"
    :class="validationClasses"
    @update:focused="emit('update:focused', $event)"
  >
    <!-- Кнопка копирования в буфер: доступна при поддержке Clipboard API
         и непустом значении. После копирования иконка на мгновение
         становится галочкой (copied из useClipboard). -->
    <template v-if="isClipboardSupported && innerModelValue" #append-inner>
      <v-btn
        :icon="copied ? mdiCheck : mdiContentCopy"
        :color="copied ? 'success' : undefined"
        variant="text"
        density="compact"
        :aria-label="t('field.copy')"
        @click.prevent="copy(innerModelValue)"
      />
    </template>
  </v-textarea>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useClipboard } from '@vueuse/core'

import { mdiCheck, mdiContentCopy, mdiPencil } from '@mdi/js'
import { useI18n } from 'vue-i18n'

/* Три состояния проверки: true — успех (зелёный), false — неуспех
   (красный), undefined — ещё не выполнялось или сброшено (обычный
   цвет поля). Явное `| undefined` нужно для exactOptionalPropertyTypes:
   CryptoWorkspace передаёт :status="verifyStatus ?? undefined". */
const props = defineProps<{
  valid?: boolean | undefined
  status?: boolean | undefined
}>()

const emit = defineEmits<{
  'update:focused': [focused: boolean]
}>()

const { t } = useI18n({ useScope: 'global' })

const validationClasses = computed(() => {
  const state = props.status ?? props.valid
  return {
    'form-field-input--valid': state === true,
    'form-field-input--invalid': state === false,
  }
})

/* Двусторонняя привязка v-model через нативный defineModel.
   Трансформер set нужен, потому что clearable у v-textarea эмитит
   null — нормализуем его в пустую строку, чтобы наружу всегда
   уходила строка. */
const innerModelValue = defineModel<string>({
  default: '',
  set: (value: string | null) => value ?? '',
})

/* Копирование содержимого поля в буфер обмена. useClipboard сам
   определяет поддержку Clipboard API (isSupported) и снимает состояние
   copied через timeout (по умолчанию 1.5 с). */
const { copy, copied, isSupported: isClipboardSupported } = useClipboard()
</script>

<style lang="scss" scoped>
.form-field-input {
  /* Вуэтифай по умолчанию прижимает блок со счётчиком к низу (flex-end)
     и добавляет сверху 6px, из-за чего счётчик «выпирает» вниз и задевает
     следующий элемент. Убираем верхний отступ и центрируем содержимое. */
  :deep(.v-input__details) {
    padding-top: 0;
    align-items: center;
    line-height: 1.5;
  }

  :deep(.v-field) {
    &.v-field--active,
    &:hover {
      color: rgb(var(--v-theme-primary));

      .v-field__overlay {
        opacity: 0 !important;
      }

      .v-field__prepend-inner .v-icon {
        --v-medium-emphasis-opacity: 1;
      }

      .v-field__input {
        color: rgb(var(--v-theme-on-background));
      }
    }

    &.v-field--variant-filled {
      .v-field__overlay {
        opacity: 0 !important;
      }
    }
  }

  &#{&}--valid {
    :deep(.v-field) {
      color: rgb(var(--v-theme-success));
    }
  }

  &#{&}--invalid {
    :deep(.v-field) {
      color: rgb(var(--v-theme-error));
    }
  }
}
</style>
