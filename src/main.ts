/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App.
 * Дополнительно регистрирует крипто-инструменты в W3C WebMCP
 * (navigator.modelContext): feature-detect, no-op при отсутствии API.
 */

// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue'

// Agent layer: WebMCP registration (feature-detected)
import { createAgentTools } from '@/agent/toolRegistry'
import { registerWebMcpTools } from '@/agent/webmcp'

// Styles
import '@fontsource/roboto'
// Глобальные переопределения Vuetify — после registerPlugins()
// (там импортируется 'vuetify/styles'), чтобы побеждать каскадом.
import '@/assets/styles/vuetify-overrides.scss'
// Глобальные стили тура: оверлеи подсказок телепортируются в body,
// поэтому стили не могут жить внутри компонентов тура.
import '@/assets/styles/tour.scss'

const app = createApp(App)

registerPlugins(app)

app.mount('#app')

/* WebMCP: регистрация после монтирования — экспериментальный API не
   должен влиять на старт приложения. Результат никуда не пишется:
   статус читается регистратором чата через повторный вызов. */
void registerWebMcpTools(createAgentTools())
