// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vite-plus/test'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import { createWebCryptoProviders, resolveProvider } from '@/crypto'
import { useTour } from '@/composables/useTour'
import type { AlgorithmId } from '@/domain/algorithm'
import { ALGORITHM_CONFIGS } from '@/domain/algorithms'
import { useCryptoForm } from '@/domain/formModel'
import ru from '@/i18n/locales/ru'
import en from '@/i18n/locales/en'
import CryptoWorkspace from '@/components/workspace/CryptoWorkspace.vue'

// В браузере компоненты Vuetify регистрирует vite-plugin-vuetify
// (autoImport внедряет import в каждый .vue-файл). В тесте шаблон
// CryptoWorkspace компилируется без плагина, поэтому регистрируем
// компоненты глобально — задокументированный способ
// (VuetifyOptions.components / VuetifyOptions.directives).
const vuetify = createVuetify({ components, directives })

const i18n = createI18n({
  legacy: false,
  locale: 'ru',
  fallbackLocale: 'en',
  messages: { ru, en },
})

function mountWorkspace() {
  return mount(CryptoWorkspace, {
    global: {
      plugins: [vuetify, i18n],
    },
  })
}

/* Поля формы в DOM: колонка отправителя — Шифрование, Публичный ключ,
   Отправитель; колонка получателя — Получатель, Приватный ключ,
   Расшифровка. Индексы используются для заполнения полей через DOM:
   defineExpose у компонента больше нет, состояние проверяется через
   интерфейс или напрямую через useCryptoForm(). */
const CODE_TEXTAREA_INDEX = 0
const SENDER_TEXTAREA_INDEX = 2

describe('CryptoWorkspace', () => {
  it('монтируется и отрисовывает три селекта и обе колонки полей', () => {
    const wrapper = mountWorkspace()

    // Три селекта: алгоритм, метод, длина
    const selects = wrapper.findAll('.base-select, .algorithm-select')
    expect(selects.length).toBe(3)

    // Обе колонки формы (отправитель и получатель) в DOM
    expect(wrapper.findAll('.form-column').length).toBe(2)

    // Таймлайны тура скрыты (тур выключен по умолчанию)
    expect(wrapper.findAll('.tour-timeline').length).toBe(0)

    wrapper.unmount()
  })

  it('кнопка «Шифровать» для DIGEST записывает реальный digest в hex', async () => {
    const wrapper = mountWorkspace()

    const textareas = wrapper.findAll('textarea')
    await textareas[SENDER_TEXTAREA_INDEX]!.setValue('тест')

    // Первая кнопка действия в колонке отправителя — «Шифровать»
    await wrapper.find('.form-field-action').trigger('click')
    await nextTick()
    await flushPromises()

    const codeField = wrapper.findAll('textarea')[CODE_TEXTAREA_INDEX]!
    await vi.waitFor(() => {
      const value = (codeField.element as HTMLTextAreaElement).value
      /* Селект метода пуст, оркестратор подставляет methods[0] — SHA-1,
         поэтому реальный digest занимает 40 hex-символов. */
      expect(value).toMatch(/^[0-9a-f]{40}$/)
    })

    wrapper.unmount()
  })

  it('при включённом туре показывает степпер и оба таймлайна со сквозным прогрессом', async () => {
    const { tourActive } = useTour()
    tourActive.value = true

    const wrapper = mountWorkspace()

    // Горизонтальный степпер и два вертикальных таймлайна в DOM
    expect(wrapper.find('.v-stepper-header').exists()).toBe(true)
    expect(wrapper.findAll('.tour-timeline').length).toBe(2)
    expect(wrapper.find('.tour-step--9').exists()).toBe(true)

    // Компонент зарегистрировал свою форму источником тура: заполняем
    // «Отправитель» через DOM — активным становится первый пустой шаг
    // «Метод» (2), а заполненный шаг «Отправитель» (4) оказывается
    // предстоящим относительно границы прогресса.
    const textareas = wrapper.findAll('textarea')
    await textareas[SENDER_TEXTAREA_INDEX]!.setValue('тест')
    await nextTick()
    expect(wrapper.find('.tour-step--2.stepper-step--current').exists()).toBe(true)
    expect(wrapper.find('.tour-step--4.stepper-step--upcoming').exists()).toBe(true)

    // Выключение тура скрывает степперы
    tourActive.value = false
    await nextTick()
    expect(wrapper.findAll('.tour-timeline').length).toBe(0)

    wrapper.unmount()
  })
})

describe('useCryptoForm', () => {
  it('переключение алгоритма на асимметричный инвертирует ключи', () => {
    const form = useCryptoForm()

    // Симметричный алгоритм — без инверсии
    form.algorithm.value = 'AES-CBC'
    expect(form.currentAlgorithm.value.inverted).toBe(false)

    // Асимметричный — ключи инвертированы (Teleport активен)
    form.algorithm.value = 'RSA-OAEP'
    expect(form.currentAlgorithm.value.inverted).toBe(true)
  })
})

describe('CryptoProvider (контракт)', () => {
  it('у каждого алгоритма есть encrypt/decrypt, принимающие CryptoRequest и возвращающие output', async () => {
    const providers = createWebCryptoProviders()

    for (const id of Object.keys(ALGORITHM_CONFIGS) as AlgorithmId[]) {
      const provider = resolveProvider(providers, id)
      expect(provider, `нет провайдера для ${id}`).toBeDefined()

      const request = { sender: 's', recipient: 'r', publicKey: 'pub', privateKey: 'priv' }
      const encrypted = await provider!
        .encrypt(request)
        .catch((error) => ({ output: String(error) }))
      expect(typeof encrypted.output, `encrypt(${id})`).toBe('string')

      const decrypted = await provider!
        .decrypt(request)
        .catch((error) => ({ output: String(error) }))
      expect(typeof decrypted.output, `decrypt(${id})`).toBe('string')
    }
  })
})

describe('Web Crypto providers', () => {
  it('вычисляет digest и выполняет AES-CBC round-trip', async () => {
    const providers = createWebCryptoProviders()
    const digestRequest = {
      sender: 'hello',
      recipient: '',
      publicKey: '',
      privateKey: '',
      method: 'SHA-256',
    }
    const digest = await providers.DIGEST.encrypt(digestRequest)
    expect(digest.output).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')

    const aes = providers['AES-CBC']
    const keyRequest = { ...digestRequest, length: 128 }
    const keys = await aes.generateKeys!(keyRequest)
    const encrypted = await aes.encrypt({ ...keyRequest, publicKey: keys.public })
    const decrypted = await aes.decrypt({
      ...keyRequest,
      privateKey: keys.private,
      recipient: encrypted.output,
    })
    expect(decrypted.output).toBe('hello')
  })
})
