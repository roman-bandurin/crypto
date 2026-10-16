// @vitest-environment happy-dom
import { describe, expect, it } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import TourParams from '@/components/TourParams.vue'
import TourTimeline from '@/components/TourTimeline.vue'
import { useTour } from '@/composables/useTour'
import type { TourSnapshot } from '@/composables/useTour'
import ru from '@/i18n/locales/ru'
import en from '@/i18n/locales/en'

// В браузере компоненты Vuetify регистрирует vite-plugin-vuetify
// (autoImport внедряет import в каждый .vue-файл). В тесте шаблон
// компилируется без плагина, поэтому регистрируем компоненты
// глобально — задокументированный способ
// (VuetifyOptions.components / VuetifyOptions.directives).
const vuetify = createVuetify({ components, directives })

const i18n = createI18n({
  legacy: false,
  locale: 'ru',
  fallbackLocale: 'en',
  messages: { ru, en },
})

/* Снимок состояния формы по умолчанию: DIGEST — есть методы, нет длин
   ключа и генерации ключей, все поля пусты. */
function makeSnapshot(overrides: Partial<TourSnapshot> = {}): TourSnapshot {
  return {
    algorithm: 'DIGEST',
    method: null,
    length: null,
    sender: '',
    recipient: '',
    publicKey: '',
    privateKey: '',
    code: '',
    decode: '',
    focusField: null,
    verifyStatus: null,
    hasMethods: true,
    hasLengths: false,
    canGenerate: false,
    inverted: false,
    ...overrides,
  }
}

/* Хост со всеми тремя секциями: подсказки TourParams ищут якоря
   (.tour-step--N .v-avatar) по документу, поэтому шаги 4–9 должны
   существовать вместе с горизонтальным степпером. */
const Host = {
  components: { TourParams, TourTimeline },
  template: `
    <div>
      <v-row>
        <TourParams />
      </v-row>
      <v-row>
        <TourTimeline section="sender" />
        <TourTimeline section="recipient" />
      </v-row>
    </div>
  `,
}

function mountTour(snapshot: TourSnapshot) {
  const { registerTourSource, tourActive } = useTour()
  registerTourSource(() => snapshot)
  tourActive.value = true
  const wrapper = mount(Host, {
    global: {
      plugins: [vuetify, i18n],
    },
  })
  return { wrapper, tourActive }
}

function unmountTour(tour: ReturnType<typeof mountTour>) {
  tour.tourActive.value = false
  tour.wrapper.unmount()
}

describe('Tour', () => {
  it('секция params показывает горизонтальный степпер: метод доступен, длина отключена', () => {
    const tour = mountTour(makeSnapshot())

    const items = tour.wrapper.findAll('.v-stepper-header .v-stepper-item')
    expect(items.length).toBe(3)
    expect(tour.wrapper.find('.tour-step--2.v-stepper-item--disabled').exists()).toBe(false)
    expect(tour.wrapper.find('.tour-step--3.v-stepper-item--disabled').exists()).toBe(true)

    unmountTour(tour)
  })

  it('таймлайны содержат шаги 4–9, шаги ключей отключены без генерации', () => {
    const tour = mountTour(makeSnapshot())

    expect(tour.wrapper.findAll('.tour-timeline').length).toBe(2)
    for (const step of [4, 5, 6, 7, 8, 9]) {
      expect(tour.wrapper.find(`.tour-step--${step}`).exists()).toBe(true)
    }
    expect(tour.wrapper.find('.tour-step--5.v-expansion-panel--disabled').exists()).toBe(true)
    expect(tour.wrapper.find('.tour-step--8.v-expansion-panel--disabled').exists()).toBe(true)

    unmountTour(tour)
  })

  it('шаг «Проверка» окрашивается результатом проверки', () => {
    const success = mountTour(makeSnapshot({ verifyStatus: true }))
    expect(success.wrapper.find('.tour-step--9.stepper-step--valid').exists()).toBe(true)
    unmountTour(success)

    const failure = mountTour(makeSnapshot({ verifyStatus: false }))
    expect(failure.wrapper.find('.tour-step--9.stepper-step--invalid').exists()).toBe(true)
    unmountTour(failure)
  })

  it('предстоящие шаги приглушены, пройденные и текущий — насыщены', () => {
    const tour = mountTour(makeSnapshot({ method: 'SHA-256', sender: 'тест' }))

    // Прогресс дошёл до пустого «Шифрования» (шаг 6)
    expect(tour.wrapper.find('.tour-step--4.stepper-step--upcoming').exists()).toBe(false)
    expect(tour.wrapper.find('.tour-step--6.stepper-step--current').exists()).toBe(true)
    expect(tour.wrapper.find('.tour-step--6.stepper-step--upcoming').exists()).toBe(false)
    expect(tour.wrapper.find('.tour-step--7.stepper-step--upcoming').exists()).toBe(true)

    unmountTour(tour)
  })

  it('фокус на поле подсвечивает его шаг', () => {
    const tour = mountTour(makeSnapshot({ focusField: 'sender' }))

    expect(tour.wrapper.find('.tour-step--4.stepper-step--focused').exists()).toBe(true)

    unmountTour(tour)
  })
})
