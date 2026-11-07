import { ref } from 'vue';
import { api, refreshCsrf } from '../lib/api';
import type { User } from '../lib/types';

export function useSession() {
  const user = ref<User | null>(null);

  async function restore() {
    await refreshCsrf();
    user.value = await api<User>('/me');
  }

  async function authenticate(username: string, password: string) {
    await refreshCsrf();
    await api('/login', 'POST', new URLSearchParams({ username, password }));
    await restore();
  }

  async function signOut() {
    await api('/logout', 'POST');
    user.value = null;
    await refreshCsrf();
  }

  return { user, restore, authenticate, signOut };
}
