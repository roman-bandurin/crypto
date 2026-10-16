/**
 * Общая подготовка тестового окружения (подключён через
 * test.setupFiles в vite.config.mts).
 *
 * happy-dom не реализует VisualViewport API, а Vuetify в стратегиях
 * позиционирования оверлеев (VOverlay/locationStrategies) обращается
 * к глобальной переменной visualViewport напрямую — без полифилла
 * открытие любого tooltip'а падает с ReferenceError.
 */
if (typeof globalThis.visualViewport === 'undefined') {
  Object.defineProperty(globalThis, 'visualViewport', {
    configurable: true,
    value: {
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: 0,
      pageTop: 0,
      width: 1024,
      height: 768,
      scale: 1,
      onresize: null,
      onscroll: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    },
  })
}
