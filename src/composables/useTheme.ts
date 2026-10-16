import { computed } from 'vue'

import { useTheme } from 'vuetify'

/* Темы заданы в src/plugins/vuetify.ts (light/dark).
   defaultTheme: 'system' — начальная тема берётся из ОС
   (prefers-color-scheme).

   useTheme() из Vuetify — composable, вызываем внутри
   useAppTheme(), поэтому safe: он вызывается из setup
   компонента, а не на уровне модуля. Глобальный reactive
   объект theme.global одинаков для всех вызовов. */
export function useAppTheme() {
  const theme = useTheme()

  const isDark = computed(() => theme.global.current.value.dark === true)

  /* Переключает тему вручную: только на текущую сессию —
     выбор нигде не сохраняется, при перезагрузке снова
     вступает в силу системная тема. */
  /* Vuetify 4: присваивать theme.global.name.value больше нельзя —
     API помечен как deprecated (Proxy выдаёт предупреждение UPGRADE).
     Штатный способ смены темы — theme.change(name). Метод возвращает
     Promise (ожидание завершения transition); переход анимацией нам
     не важен, поэтому промис сознательно отбрасывается через void. */
  function toggle() {
    void theme.change(isDark.value ? 'light' : 'dark')
  }

  return { isDark, toggle }
}
