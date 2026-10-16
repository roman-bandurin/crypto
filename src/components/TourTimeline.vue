<template>
  <!-- Вертикальный таймлайн по бокам колонок формы. Рендерится на месте
       (без Teleport), поэтому остаётся прямым ребёнком v-row и корректно
       участвует в сетке и анимации. -->
  <Transition name="tour-collapse">
    <v-col
      v-if="tourActive"
      ref="timelineEl"
      cols="1"
      md="1"
      class="tour-timeline d-flex flex-column flex-nowrap pt-15"
      :class="`tour-timeline--${section}`"
    >
      <v-stepper-vertical v-model="stepModel" color="secondary" mobile hide-actions flat editable>
        <v-stepper-vertical-item
          v-for="step in sectionSteps"
          :key="step"
          :value="step"
          :class="stepClasses(step)"
          :disabled="isStepDisabled(step)"
        />
      </v-stepper-vertical>
    </v-col>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

import { useResizeObserver, whenever } from '@vueuse/core'

import { VStepperVertical, VStepperVerticalItem } from 'vuetify/components/VStepperVertical'

import { useTour } from '@/composables/useTour'
import type { TourSection } from '@/composables/useTour'
import { useTourSteps } from '@/composables/useTourSteps'

/* Импорт VStepperVertical в v4 — из стабильных компонентов
   (в v3 был vuetify/labs/VStepperVertical). */
void VStepperVertical
void VStepperVerticalItem

/* Секция таймлайна: sender — шаги 6–4 слева от формы,
   recipient — шаги 7–9 справа. */
const props = defineProps<{
  section: Exclude<TourSection, 'params'>
}>()

const { tourActive } = useTour()
const { stepModel, isStepDisabled, stepClasses } = useTourSteps()

/* Номера шагов вертикального таймлайна в порядке DOM: у отправителя
   цепочка идёт снизу вверх (6 → 5 → 4), у получателя — сверху вниз
   (7 → 8 → 9). */
const sectionSteps = computed<number[]>(() => {
  if (props.section === 'sender') return [6, 5, 4]
  return [7, 8, 9]
})

/* Колонка таймлайна: ссылка на корневой элемент v-col нужна
   синхронизации высот. */
const timelineEl = ref<{ $el?: HTMLElement } | null>(null)

/* Связываем авторасширение полей с размером пунктов таймлайна: высота
   каждого пункта степпера выставляется равной высоте соответствующей
   группы полей. Пока пункты и группы растут одинаково, иконки остаются
   на уровне плейсхолдеров полей, а сами пункты не «уезжают» в начало.
   Наблюдаем колонку формы: она flex-контейнер групп, поэтому изменение
   высоты любой группы меняет и её размеры. ResizeObserver может
   отсутствовать в тестовом окружении (happy-dom) — useResizeObserver
   в этом случае просто не подписывается. */
function syncTimelineHeights() {
  const timeline = timelineEl.value?.$el
  if (!timeline) return
  const column = timeline.parentElement?.querySelector<HTMLElement>(
    `.form-column--${props.section}`,
  )
  if (!column) return
  const groups = Array.from(column.children) as HTMLElement[]
  const panels = Array.from(timeline.querySelectorAll<HTMLElement>('.v-expansion-panel'))

  panels.forEach((panel, index) => {
    const group = groups[index]
    panel.style.minHeight = group ? `${Math.ceil(group.getBoundingClientRect().height)}px` : ''
  })
}

/* Наблюдение за колонкой формы: рост групп полей меняет высоту колонки
   формы, поэтому именно её элемент передаётся наблюдателю. Колонка
   существует независимо от тура, а синхронизация нужна только при
   активном туре — разовую синхронизацию после появления таймлайна
   делает whenever ниже. */
const columnEl = computed<HTMLElement | null>(() => {
  const timeline = timelineEl.value?.$el
  if (!timeline) return null
  return (
    timeline.parentElement?.querySelector<HTMLElement>(`.form-column--${props.section}`) ?? null
  )
})

useResizeObserver(columnEl, () => {
  void nextTick(syncTimelineHeights)
})

whenever(
  tourActive,
  () => {
    /* При включении тура колонка таймлайна появляется в DOM — разовая
       синхронизация выполняется после отрисовки. */
    void nextTick(syncTimelineHeights)
  },
  { immediate: true },
)
</script>
