<script setup lang="ts">
import { passwordError } from '../lib/password';
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { api } from '../lib/api';
import Icon from './Icon.vue';
import { confirmAction } from '../lib/confirm';
import { trapDialogTab } from '../lib/dialog';
import type { Account } from '../lib/types';
const props = defineProps<{ userId: number }>();
const emit = defineEmits<{ password: []; success: [string]; dirty: [boolean] }>();
const rows = ref<Account[]>([]),
  loading = ref(true),
  error = ref(''),
  dialog = ref<HTMLDialogElement>(),
  mode = ref('create'),
  target = ref<Account | null>(null),
  username = ref(''),
  password = ref(''),
  visible = ref(false),
  saving = ref(false),
  formError = ref(''),
  filter = ref(''),
  modalOpen = ref(false);
let alive = true;
onBeforeUnmount(() => {
  alive = false;
  emit('dirty', false);
});
watch([username, password], () => (formError.value = ''));
watch([username, password, modalOpen], () =>
  emit(
    'dirty',
    modalOpen.value &&
      (mode.value === 'rename'
        ? username.value !== (target.value?.username || '')
        : !!password.value || (mode.value === 'create' && !!username.value)),
  ),
);
async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = await api<Account[]>('/admin/accounts');
    if (alive) rows.value = data;
  } catch (e) {
    if (alive) error.value = e instanceof Error ? e.message : '账号加载失败';
  } finally {
    if (alive) loading.value = false;
  }
}
onMounted(load);
async function open(next: string, a: Account | null = null) {
  if (saving.value) return;
  mode.value = next;
  target.value = a;
  username.value = a?.username || '';
  password.value = '';
  visible.value = false;
  formError.value = '';
  await nextTick();
  dialog.value?.showModal();
  modalOpen.value = true;
}
async function close() {
  if (saving.value) return;
  const changed =
    mode.value === 'rename'
      ? username.value !== (target.value?.username || '')
      : !!password.value || (mode.value === 'create' && !!username.value);
  if (changed && !(await confirmAction('放弃本次修改？', '账号信息尚未保存。', '放弃修改', true)))
    return;
  dialog.value?.close();
  modalOpen.value = false;
  password.value = '';
}
async function save() {
  if (saving.value || (mode.value !== 'create' && !target.value)) return;
  formError.value = '';
  if (mode.value !== 'reset' && !/^[a-zA-Z0-9_-]{3,40}$/.test(username.value.trim())) {
    formError.value = '账号名称需为 3–40 位字母、数字、下划线或短横线';
    return;
  }
  if (mode.value !== 'rename') {
    formError.value = passwordError(password.value);
    if (formError.value) return;
  }
  saving.value = true;
  try {
    if (mode.value === 'create')
      await api('/admin/accounts', 'POST', {
        username: username.value.trim(),
        password: password.value,
      });
    else if (mode.value === 'rename')
      await api('/admin/accounts/' + target.value!.id, 'PUT', { username: username.value.trim() });
    else
      await api('/admin/accounts/' + target.value!.id + '/password', 'PUT', {
        password: password.value,
      });
    dialog.value?.close();
    modalOpen.value = false;
    password.value = '';
    emit(
      'success',
      mode.value === 'create'
        ? '账号已创建'
        : mode.value === 'rename'
          ? '账号名称已修改'
          : '密码已重置，该账号需重新登录',
    );
    await load();
  } catch (e) {
    formError.value = e instanceof Error ? e.message : '操作失败，请重试';
  } finally {
    saving.value = false;
  }
}
async function remove(a: Account) {
  if (saving.value) return;
  if (
    !(await confirmAction(
      '删除账号「' + a.username + '」？',
      '删除后，该账号将退出登录，无法继续访问。',
      '删除账号',
      true,
    ))
  )
    return;
  if (saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    await api('/admin/accounts/' + a.id, 'DELETE');
    emit('success', '账号已删除');
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '删除失败';
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <section class="account-manager">
    <div class="section-head">
      <div>
        <h1>账号管理</h1>
        <p class="muted">管理员维护内容，普通账号查看题目与回答。</p>
      </div>
      <button class="primary" :disabled="saving" @click="open('create')">
        <Icon name="plus" :size="17" />创建账号
      </button>
    </div>
    <div class="account-tools">
      <label
        ><span class="sr-only">搜索账号</span
        ><input v-model="filter" type="search" placeholder="搜索账号名称" /></label
      ><span>{{ rows.length }} 个账号</span>
    </div>
    <div v-if="error" class="error feedback" role="alert">
      {{ error }}<button @click="load">重试</button>
    </div>
    <div v-if="loading" class="panel loading-state" role="status">正在加载账号…</div>
    <div v-else class="panel account-list">
      <div class="account-list-label"><span>账号</span><span>角色</span><span>操作</span></div>
      <article
        v-for="a in rows.filter((a) => a.username.toLowerCase().includes(filter.toLowerCase()))"
        :key="a.id"
        class="management-row account-row"
      >
        <div class="account-identity">
          <span class="account-avatar">{{ a.username.slice(0, 1).toUpperCase() }}</span>
          <div>
            <strong>{{ a.username }}</strong
            ><small v-if="a.id === userId">当前账号</small>
          </div>
        </div>
        <span class="account-role">{{ a.role === 'ADMIN' ? '管理员' : '普通账号' }}</span>
        <div v-if="a.role !== 'ADMIN'" class="actions">
          <button :disabled="saving" @click="open('rename', a)">修改</button
          ><button :disabled="saving" @click="open('reset', a)">重置密码</button
          ><button class="danger" :disabled="saving" @click="remove(a)">删除</button>
        </div>
        <button v-else-if="a.id === userId" @click="emit('password')">修改密码</button
        ><span v-else class="muted">管理员账号</span>
      </article>
      <p
        v-if="!rows.some((a) => a.username.toLowerCase().includes(filter.toLowerCase()))"
        class="empty"
      >
        没有匹配的账号。
      </p>
    </div>
    <dialog
      ref="dialog"
      class="form-dialog"
      aria-labelledby="account-dialog-title"
      @cancel.prevent="close"
      @keydown.capture="(e) => trapDialogTab(e, dialog)"
    >
      <form novalidate @submit.prevent="save">
        <div class="dialog-heading">
          <h2 id="account-dialog-title">
            {{ mode === 'create' ? '创建账号' : mode === 'rename' ? '修改账号名称' : '重置密码' }}
          </h2>
          <button type="button" aria-label="关闭账号编辑" :disabled="saving" @click="close">
            <Icon name="close" :size="19" />
          </button>
        </div>
        <p class="muted">
          {{
            mode === 'create'
              ? '新账号可以查看全部题目与回答。'
              : mode === 'rename'
                ? '修改名称后，该账号需要重新登录。'
                : '为 ' + target?.username + ' 设置新密码，已有登录会话将失效。'
          }}
        </p>
        <label v-if="mode !== 'reset'"
          >{{ mode === 'create' ? '新账号' : '账号名称'
          }}<input
            v-model="username"
            :disabled="saving"
            required
            autofocus
            pattern="[a-zA-Z0-9_-]{3,40}"
            maxlength="40"
            autocomplete="off"
            placeholder="3–40 位字母、数字、下划线或短横线"
        /></label>
        <div v-if="mode !== 'rename'" class="form-field">
          <label for="account-password">{{ mode === 'create' ? '初始密码' : '新密码' }}</label
          ><span class="password-input"
            ><input
              id="account-password"
              v-model="password"
              :disabled="saving"
              :autofocus="mode === 'reset'"
              :type="visible ? 'text' : 'password'"
              required
              minlength="12"
              maxlength="64"
              autocomplete="new-password"
              placeholder="12–64 个字符"
            /><button
              type="button"
              :aria-label="visible ? '隐藏密码' : '显示密码'"
              @click="visible = !visible"
            >
              {{ visible ? '隐藏' : '显示' }}
            </button></span
          >
        </div>
        <p v-if="formError" class="inline-error" role="alert">{{ formError }}</p>
        <div class="dialog-actions">
          <button type="button" :disabled="saving" @click="close">取消</button
          ><button class="primary" :disabled="saving">
            {{
              saving
                ? '保存中…'
                : mode === 'create'
                  ? '创建账号'
                  : mode === 'rename'
                    ? '保存修改'
                    : '重置密码'
            }}
          </button>
        </div>
      </form>
    </dialog>
  </section>
</template>
