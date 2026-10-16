<template>
  <v-select class="base-select">
    <template #item="{ props }">
      <v-list-item class="base-select-list-item" v-bind="props" />
    </template>
  </v-select>
</template>

<script setup lang="ts">
/* Обёртка над v-select без собственной логики: props списка
   (title/value) прокидываются в v-list-item через слот item. */
</script>

<style lang="scss" scoped>
.base-select {
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

  &-list-item.v-list-item--active,
  &-list-item:hover {
    background-color: rgb(var(--v-theme-secondary)) !important;
    color: rgb(var(--v-theme-on-secondary)) !important;

    & > .v-list-item__overlay {
      opacity: 0;
    }
  }
}
</style>
