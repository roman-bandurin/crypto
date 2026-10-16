<template>
  <!-- Переключатель темы: значок текущей темы —
       луна в светлой (переключит на тёмную),
       солнце в тёмной (переключит на светлую).
       Тематика «планшет/небо» созвучна светлой теме;
       в тёмной солнце становится акцентом на поверхности. -->
  <v-tooltip :text="tooltip" location="bottom">
    <template #activator="{ props }">
      <v-btn v-bind="props" :aria-label="tooltip" icon @click="toggle">
        <v-icon :icon="isDark ? mdiWeatherSunny : mdiWeatherNight" />
      </v-btn>
    </template>
  </v-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { mdiWeatherNight, mdiWeatherSunny } from '@mdi/js'
import { useI18n } from 'vue-i18n'

import { useAppTheme } from '@/composables/useTheme'

const { t } = useI18n({ useScope: 'global' })
const { isDark, toggle } = useAppTheme()

/* Подсказка описывает активную тему, а не действие —
   так понятнее текущее состояние приложения. */
const tooltip = computed(() => (isDark.value ? t('theme.dark') : t('theme.light')))
</script>
