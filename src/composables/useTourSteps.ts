import { computed } from 'vue'

import { isStepDisabled as isStepDisabledBySnapshot, useTour } from '@/composables/useTour'

/**
 * composables/useTourSteps.ts
 *
 * Общая презентационная логика шагов тура для TourParams.vue и
 * TourTimeline.vue: единый активный шаг (v-model степперов), отключённые
 * шаги и классы насыщенности/подсветки. Состояние тура читается через
 * useTour, поэтому оба компонента всегда согласованы между собой.
 */
export function useTourSteps() {
  const { snapshot, handleStep, progressStep, focusedStep } = useTour()

  /* Единый активный шаг передаётся всем степперам: подсветится
     (и покажет карандаш) только тот, у которого есть такой номер. Сеттер
     пуст — активным шагом управляют данные, а не клик. */
  const stepModel = computed<number>({
    get: () => handleStep.value,
    set: () => {
      // Активным шагом управляют данные (фокус/первое пустое поле).
    },
  })

  /* Отключённые шаги: 2 — у алгоритма нет методов, 3 — нет длин ключа,
     5 и 8 — алгоритм не умеет генерировать ключи. */
  function isStepDisabled(step: number): boolean {
    return isStepDisabledBySnapshot(snapshot.value, step)
  }

  /* Классы шага «Проверка»: зелёный при успехе, красный при неуспехе,
     без класса — пока проверка не выполнялась или сброшена. */
  const verifyStepClasses = computed(() => ({
    'stepper-step--valid': snapshot.value?.verifyStatus === true,
    'stepper-step--invalid': snapshot.value?.verifyStatus === false,
  }))

  /* Классы шага: приглушаем только предстоящие (номер больше границы
     прогресса), текущий и шаг поля в фокусе выделяем насыщенностью;
     шаг 9 дополнительно окрашивается результатом проверки. */
  function stepClasses(step: number) {
    return [
      { 'stepper-step--upcoming': step > progressStep.value },
      { 'stepper-step--current': step === handleStep.value },
      { 'stepper-step--focused': focusedStep.value === step },
      step === 9 ? verifyStepClasses.value : null,
      'tour-step',
      `tour-step--${step}`,
    ]
  }

  return { stepModel, isStepDisabled, stepClasses }
}
