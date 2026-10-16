<template>
  <!-- Переключатель языка: значок перевода, текущий язык
       показан бейджем в стиле селекта алгоритма —
       коричневый primary-бейдж снизу справа «обрезает»
       нижнюю часть значка, на нём белый код языка,
       пункты меню — с отметкой выбранного. -->
  <v-menu>
    <template #activator="{ props }">
      <v-tooltip :text="t('language.label')" location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="{ ...props, ...tooltipProps }"
            :aria-label="`${t('language.label')}: ${currentCode}`"
            icon
          >
            <v-badge
              :content="currentCode"
              :offset-x="1"
              :offset-y="16"
              color="primary"
              class="language-switcher-badge"
            >
              <v-icon :icon="mdiTranslate" />
            </v-badge>
          </v-btn>
        </template>
      </v-tooltip>
    </template>

    <v-list density="compact">
      <v-list-item v-for="locale in locales" :key="locale.value" @click="setLocale(locale.value)">
        <v-list-item-title>{{ locale.title }}</v-list-item-title>
        <template #append>
          <v-icon
            v-if="locale.value === currentLocale"
            :icon="mdiCheck"
            color="primary"
            size="small"
          />
        </template>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { mdiCheck, mdiTranslate } from '@mdi/js'
import { useI18n } from 'vue-i18n'

import { useLocale } from '@/composables/useLocale'

const { t } = useI18n({ useScope: 'global' })
const { currentLocale, setLocale } = useLocale()

/* Доступные языки. Названия берутся из словаря, поэтому
   пункты «Русский»/«English» отображаются на текущем
   языке и обновляются при переключении. */
const locales = computed(() => [
  { value: 'ru' as const, title: t('language.ru') },
  { value: 'en' as const, title: t('language.en') },
])

/* Код текущего языка — короткая метка в бейдже. */
const currentCode = computed(() => currentLocale.value.toUpperCase())
</script>

<style lang="scss" scoped>
/* Бейдж с кодом языка — размеры и offsets, как у бейджа
   в селекте алгоритма. Цвет primary совпадает с панелью,
   поэтому бейдж выглядит как вырезанный из фона фрагмент
   с белым кодом языка; нижняя часть значка перевода
   оказывается за бейджем. */
.language-switcher-badge {
  :deep(.v-badge__badge) {
    min-width: 16px !important;
    height: 14px !important;
    padding: 0 3px !important;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.02em;
    /* Цвет текста повторяет цвет иконки: бейдж лежит на primary,
       поэтому берём on-primary — он совпадает с цветом заголовка
       и значка в обеих темах (в светлой белый, в тёмной тёмный). */
    color: rgb(var(--v-theme-on-primary)) !important;
  }
}
</style>
