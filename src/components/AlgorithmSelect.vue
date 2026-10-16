<template>
  <v-select class="algorithm-select">
    <template #item="{ props }">
      <v-list-subheader v-if="props.header" class="algorithm-select-subheader font-weight-medium">
        <v-badge
          :icon="(props.icon as string[] | undefined)?.[1]"
          :offset-y="16"
          :offset-x="1"
          color="primary"
          class="algorithm-select-badge"
        >
          <v-icon :icon="(props.icon as string[] | undefined)?.[0]" start class="mr-1" />
        </v-badge>
        {{ t(String(props.header)) }}
      </v-list-subheader>
      <v-divider v-else-if="props.divider" />
      <v-list-item v-else class="algorithm-select-list-item" v-bind="props" />
    </template>
  </v-select>
</template>

<script setup lang="ts">
import type { IconValue } from 'vuetify/lib/composables/icons.mjs'

import { useI18n } from 'vue-i18n'

/* Заголовки групп алгоритмов хранятся в доменном справочнике
   (domain/algorithms.ts) как ключи i18n, поэтому переводим их здесь —
   при смене языка список перерисуется автоматически.
   Иконки приходят из domain/algorithms.ts парой SVG-path из @mdi/js:
   [основная, дополнительная для бейджа]. */
defineProps<{
  iconPrimary?: IconValue | undefined
  iconSecondary?: IconValue | undefined
}>()

const { t } = useI18n({ useScope: 'global' })
</script>

<style lang="scss" scoped>
.algorithm-select {
  :deep(.v-field) {
    &.v-field--active,
    &:hover {
      color: rgb(var(--v-theme-primary));

      .v-field__overlay {
        opacity: 0 !important;
      }

      .v-field__prepend-inner .v-icon {
        --v-medium-emphasis-opacity: 1;
      }

      .v-field__input {
        color: rgb(var(--v-theme-on-background));
      }
    }

    &.v-field--variant-filled {
      .v-field__overlay {
        opacity: 0 !important;
      }
    }
  }

  &-subheader {
    background-color: rgb(var(--v-theme-primary)) !important;
    color: rgb(var(--v-theme-on-primary)) !important;
  }

  &-list-item.v-list-item--active,
  &-list-item:hover {
    background-color: rgb(var(--v-theme-secondary)) !important;
    color: rgb(var(--v-theme-on-secondary)) !important;

    & > .v-list-item__overlay {
      opacity: 0;
    }
  }

  &-badge {
    :deep(.v-badge__badge) {
      padding: 0px 3px !important;
      min-width: 14px !important;
      height: 14px !important;
    }
  }
}
</style>
