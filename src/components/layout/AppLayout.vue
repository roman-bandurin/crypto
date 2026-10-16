<template>
  <v-app>
    <v-app-bar app absolute color="primary">
      <v-container class="d-flex align-center">
        <v-toolbar-title>
          <v-icon :icon="mdiLockOutline" start />
          {{ t('app.title') }}
        </v-toolbar-title>

        <v-spacer />

        <!-- Переключатель темы: берёт тему из системы,
             ручное переключение — только на текущую сессию -->
        <ThemeSwitcher />

        <!-- Переключатель языка интерфейса (ru/en) -->
        <LanguageSwitcher />

        <!-- Кнопка AI-ассистента: открывает плавающий чат (Alt+A). -->
        <v-tooltip :text="t('ai.title')" location="bottom">
          <template #activator="{ props }">
            <v-btn v-bind="props" :aria-label="t('ai.title')" icon @click="aiChatOpen = true">
              <v-icon :icon="mdiRobotOutline" />
            </v-btn>
          </template>
        </v-tooltip>

        <!-- Кнопка активации интерактивного тура: включает и выключает
             показ степперов и подсказок в рабочей области. В активном
             состоянии кнопка залита (variant filled), в покое — контурная. -->
        <v-tooltip :text="tourActive ? t('tour.disable') : t('tour.enable')" location="bottom">
          <template #activator="{ props }">
            <!-- Активная кнопка тура — белая подложка с коричневой
                 (primary) иконкой; иначе коричневый фон слился бы с
                 панелью. В покое подложки нет, иконка белая, как текст. -->
            <v-btn
              v-bind="props"
              :aria-label="tourActive ? t('tour.disable') : t('tour.enable')"
              :variant="tourActive ? 'flat' : 'text'"
              :color="tourActive ? 'surface' : undefined"
              icon
              @click="toggleTour"
            >
              <v-icon
                :icon="tourActive ? mdiSchool : mdiSchoolOutline"
                :color="tourActive ? 'primary' : undefined"
              />
            </v-btn>
          </template>
        </v-tooltip>
      </v-container>
    </v-app-bar>

    <v-main>
      <slot></slot>
    </v-main>

    <!-- Плавающее окно AI-ассистента: подключается к LM Studio или
         любому [OI]-совместимому эндпоинту и вызывает крипто-инструменты. -->
    <AiChatDialog v-model="aiChatOpen" />

    <v-footer app />
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { mdiLockOutline, mdiRobotOutline, mdiSchool, mdiSchoolOutline } from '@mdi/js'
import { useHotkey } from 'vuetify'
import { useI18n } from 'vue-i18n'

import AiChatDialog from '@/components/ai/AiChatDialog.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'
import { useTour } from '@/composables/useTour'

const { t } = useI18n({ useScope: 'global' })
const { tourActive, toggleTour } = useTour()

/** Открыт ли плавающий чат AI-ассистента. */
const aiChatOpen = ref(false)

/* Горячая клавиша тура: Alt+T переключает показ степперов и подсказок
   без мыши. Штатный composable Vuetify сам снимает слушатель при
   размонтировании компонента. Обёртка нужна, потому что toggle от
   useToggle принимает необязательный boolean, а useHotkey передаёт
   KeyboardEvent. */
useHotkey('alt+t', () => toggleTour())
</script>
