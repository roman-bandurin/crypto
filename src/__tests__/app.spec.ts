// @vitest-environment happy-dom
import { describe, expect, it } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// В браузере компоненты Vuetify регистрирует vite-plugin-vuetify
// (autoImport внедряет import в каждый .vue-файл), поэтому
// src/plugins/vuetify.ts обходится без `components`.
// В тесте inline-шаблон компилируется без плагина, поэтому
// регистрируем компоненты глобально — задокументированный способ
// (VuetifyOptions.components / VuetifyOptions.directives).
describe('app shell', () => {
  it('renders VApp', () => {
    const vuetify = createVuetify({ components, directives })
    const TestComponent = {
      template: '<v-app><v-main>Test</v-main></v-app>',
    }
    const wrapper = mount(TestComponent, {
      global: {
        plugins: [vuetify],
      },
    })
    expect(wrapper.text()).toContain('Test')
    wrapper.unmount()
  })
})
