<template>
  <!-- Горизонтальный степпер параметров: шаги 1–3 (алгоритм, метод,
       длина ключа). Показывается только при включённом туре. -->
  <Transition name="tour-collapse">
    <v-col v-if="tourActive" cols="12">
      <v-stepper v-model="stepModel" mobile color="secondary" hide-actions flat>
        <v-stepper-header>
          <template v-for="step in 3" :key="step">
            <v-stepper-item
              :value="step"
              :class="stepClasses(step)"
              editable
              color="secondary"
              :disabled="isStepDisabled(step)"
            />
            <v-divider v-if="step < 3" />
          </template>
        </v-stepper-header>
      </v-stepper>
    </v-col>
  </Transition>

  <!-- Всплывающие подсказки тура. У активного шага подсказка открыта
       постоянно, у остальных — по наведению. Якорь — аватар шага,
       положение «top»: подсказка раскрывается вверх и не перекрывает
       редактируемое поле текущего шага. Якоря ищутся по документу,
       поэтому подсказки живут в единственном экземпляре здесь, а шаги
       4–9 рендерит TourTimeline.vue. -->
  <template v-if="tourActive">
    <template v-for="step in 9" :key="`tour-hint-${step}`">
      <v-tooltip
        :model-value="tooltipOpen[step] ?? false"
        :activator="`.tour-step--${step} .v-avatar`"
        location="top"
        :offset="16"
        content-class="tour-tooltip"
        @update:model-value="tooltipOpen[step] = $event"
      >
        {{ tourHints[step] }}
      </v-tooltip>
    </template>
  </template>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, watch } from 'vue'

import { whenever } from '@vueuse/core'

import { useI18n } from 'vue-i18n'

import { useTour } from '@/composables/useTour'
import { useTourSteps } from '@/composables/useTourSteps'

const { t } = useI18n({ useScope: 'global' })
const { tourActive, handleStep } = useTour()
const { stepModel, isStepDisabled, stepClasses } = useTourSteps()

/* Подсказки тура по номерам шагов: переводы берутся из i18n,
   поэтому тексты переключаются вместе с языком интерфейса. */
const tourHints = computed<Record<number, string>>(() => ({
  1: t('tour.hints.1'),
  2: t('tour.hints.2'),
  3: t('tour.hints.3'),
  4: t('tour.hints.4'),
  5: t('tour.hints.5'),
  6: t('tour.hints.6'),
  7: t('tour.hints.7'),
  8: t('tour.hints.8'),
  9: t('tour.hints.9'),
}))

/* Открыта ли подсказка каждого шага. Значение управляется вручную
   (openCurrentTooltip / watch handleStep) и сбрасывается при смене
   активного шага. */
const tooltipOpen = reactive<Record<number, boolean>>({
  1: false,
  2: false,
  3: false,
  4: false,
  5: false,
  6: false,
  7: false,
  8: false,
  9: false,
})

/* Открываем подсказку текущего шага (у остальных она появляется только
   при наведении). Вызывается после монтирования, когда шаги уже в DOM. */
function openCurrentTooltip() {
  tooltipOpen[handleStep.value] = true
}

/* При переходе на другой шаг закрываем подсказки: открытой остаётся
   только подсказка нового активного шага. */
watch(handleStep, (next, prev) => {
  if (prev in tooltipOpen) tooltipOpen[prev] = false
  if (next in tooltipOpen) tooltipOpen[next] = true
})

/* Подсказка активного шага открывается при каждом включении тура
   (в том числе если тур уже активен на момент монтирования:
   immediate запускает колбэк сразу) и после отрисовки. */
whenever(
  tourActive,
  () => {
    void nextTick(openCurrentTooltip)
  },
  { immediate: true },
)
</script>
