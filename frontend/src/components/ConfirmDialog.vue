<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { pendingConfirm, settleConfirm } from '../lib/confirm';
import Icon from './Icon.vue';
import { trapDialogTab } from '../lib/dialog';
const dialog = ref<HTMLDialogElement>();
watch(pendingConfirm, async (p) => {
  await nextTick();
  if (p) {
    dialog.value?.showModal();
  } else dialog.value?.close();
});
</script>
<template>
  <dialog
    ref="dialog"
    class="confirm-dialog"
    aria-labelledby="confirm-title"
    @keydown.capture="(e) => trapDialogTab(e, dialog)"
    @cancel.prevent="settleConfirm(false)"
  >
    <template v-if="pendingConfirm"
      ><div class="confirm-symbol" :class="{ danger: pendingConfirm.danger }">
        <Icon :name="pendingConfirm.danger ? 'trash' : 'info'" :size="24" />
      </div>
      <h2 id="confirm-title">{{ pendingConfirm.title }}</h2>
      <p>{{ pendingConfirm.message }}</p>
      <div class="confirm-actions">
        <button autofocus @click="settleConfirm(false)">取消</button
        ><button
          :class="pendingConfirm.danger ? 'danger-primary' : 'primary'"
          @click="settleConfirm(true)"
        >
          {{ pendingConfirm.label }}
        </button>
      </div></template
    >
  </dialog>
</template>
