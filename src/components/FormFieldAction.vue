<template>
  <v-btn
    color="secondary"
    elevation="2"
    class="form-field-action mb-3"
    :disabled="disabled || loading"
    :loading="loading"
    @click="emit('click')"
  >
    <v-icon :icon="actionIcon" start class="mx-1" />
    <slot>
      {{ actionText }}
    </slot>
  </v-btn>
</template>

<script setup lang="ts">
import type { IconValue } from 'vuetify/lib/composables/icons.mjs'

/* Иконка — SVG-path из @mdi/js (тип IconValue Vuetify),
   а не строковое имя шрифта @mdi/font. */
defineProps<{
  actionIcon: IconValue
  actionText?: string | undefined
  disabled?: boolean | undefined
  /** Выполняется ли асинхронная операция кнопки (шифрование, генерация
   *  ключей, расшифровка): v-btn показывает спиннер и блокирует клики. */
  loading?: boolean | undefined
}>()

const emit = defineEmits<{ click: [] }>()
</script>

<style lang="scss" scoped>
/* Вид отключённой кнопки как в эталоне: светлый непрозрачный фон с серым
   текстом (без тени). Насыщенность согласована с отключённым полем и шагом
   степпера — используется общая переменная приглушения. */
.form-field-action {
  &.v-btn--disabled {
    background-color: rgb(var(--v-theme-surface-light)) !important;
    color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity)) !important;
    box-shadow: none !important;
  }
}
</style>
