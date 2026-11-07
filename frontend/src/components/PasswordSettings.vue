<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { api } from '../lib/api';
import { passwordError } from '../lib/password';

defineProps<{ username: string }>();
const emit = defineEmits<{ success: [string]; dirty: [boolean] }>();
const oldPassword = ref(''),
  newPassword = ref(''),
  busy = ref(false),
  error = ref('');
watch([oldPassword, newPassword], () => {
  error.value = '';
  emit('dirty', !!oldPassword.value || !!newPassword.value);
});
let alive = true;
onBeforeUnmount(() => {
  alive = false;
  emit('dirty', false);
});

async function save() {
  if (busy.value) return;
  error.value = passwordError(newPassword.value);
  if (error.value) return;
  busy.value = true;
  error.value = '';
  try {
    await api('/me/password', 'PUT', {
      oldPassword: oldPassword.value,
      newPassword: newPassword.value,
    });
    if (!alive) return;
    oldPassword.value = '';
    newPassword.value = '';
    emit('success', '密码已修改，其他设备需重新登录');
  } catch (e) {
    if (alive) error.value = e instanceof Error ? e.message : '修改密码失败';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="narrow">
    <div class="section-head">
      <div>
        <h1>修改密码</h1>
        <p class="muted">{{ username }}</p>
      </div>
    </div>
    <form class="panel password-form" @submit.prevent="save">
      <label
        >原密码<input
          v-model="oldPassword"
          :disabled="busy"
          type="password"
          required
          autocomplete="current-password"
      /></label>
      <label
        >新密码<input
          v-model="newPassword"
          :disabled="busy"
          type="password"
          required
          minlength="12"
          maxlength="64"
          autocomplete="new-password"
      /></label>
      <p class="muted">
        新密码为 12–64 个字符，UTF-8 编码不超过 72 字节。修改后其他设备需重新登录。
      </p>
      <p v-if="error" class="inline-error" role="alert">{{ error }}</p>
      <button class="primary" :disabled="busy">{{ busy ? '保存中…' : '保存密码' }}</button>
    </form>
  </section>
</template>
