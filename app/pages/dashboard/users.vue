<script setup lang="ts">
import type { Profile } from "~/types";

definePageMeta({
  middleware: "auth-admin",
  layout: "dashboard",
});

useSeoMeta({
  title: "Quản lý người dùng",
});

const { isAdmin, loading: userLoading } = useUser();
const router = useRouter();
const toast = useToast();
const supabase = useSupabaseClient();

const users = ref<Profile[]>([]);
const loading = ref(false);

const fetchUsers = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    users.value = data as Profile[];
  } catch (error: unknown) {
    const err = error as Error;
    toast.add({ title: "Lỗi", description: err.message, color: "error" });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (isAdmin.value) {
    fetchUsers();
  }
});

// Edit User Modal
const editModal = ref(false);
const currentUser = ref<Profile | null>(null);
const editForm = ref({
  role: "customer",
  credits: 0,
});

const openEditModal = (user: Profile) => {
  currentUser.value = user;
  editForm.value = {
    role: user.role || "customer",
    credits: user.credits || 0,
  };
  editModal.value = true;
};

const isSaving = ref(false);
const saveUser = async () => {
  if (!currentUser.value) return;
  isSaving.value = true;

  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        role: editForm.value.role,
        credits: editForm.value.credits,
      })
      .eq("id", currentUser.value.id);

    if (error) throw error;

    toast.add({
      title: "Thành công",
      description: "Đã cập nhật người dùng",
      color: "primary",
    });
    editModal.value = false;
    await fetchUsers();
  } catch (error: unknown) {
    const err = error as Error;
    toast.add({ title: "Lỗi", description: err.message, color: "error" });
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <UDashboardPanel id="users" :ui="{ body: 'lg:py-8' }">
    <template #body>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">Quản lý người dùng</h2>
            <UButton
              color="neutral"
              icon="i-lucide-refresh-cw"
              @click="fetchUsers"
              :loading="loading"
            >
              Làm mới
            </UButton>
          </div>
        </template>
        <div class="overflow-x-auto">
          <table
            class="min-w-full divide-y divide-slate-200 dark:divide-slate-700"
          >
            <thead
              class="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-900 dark:text-slate-400"
            >
              <tr>
                <th class="px-4 py-3">Tên</th>
                <th class="px-4 py-3">Vai trò</th>
                <th class="px-4 py-3">Credits</th>
                <th class="px-4 py-3">Ngày tham gia</th>
                <th class="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody
              class="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-950"
            >
              <tr v-for="user in users" :key="user.id">
                <td
                  class="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white"
                >
                  {{ user.name || "Người dùng" }}
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm">
                  <span
                    :class="[
                      'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                      user.role === 'admin'
                        ? 'bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-900/20 dark:text-red-400'
                        : user.role === 'employee'
                          ? 'bg-blue-50 text-blue-700 ring-blue-600/10 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-green-50 text-green-700 ring-green-600/10 dark:bg-green-900/20 dark:text-green-400',
                    ]"
                  >
                    {{ user.role || "customer" }}
                  </span>
                </td>
                <td
                  class="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300"
                >
                  <span class="font-semibold">{{ user.credits || 0 }}</span>
                </td>
                <td
                  class="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300"
                >
                  {{
                    new Date(user.created_at || "").toLocaleDateString("vi-VN")
                  }}
                </td>
                <td
                  class="px-4 py-4 whitespace-nowrap text-sm text-right space-x-2"
                >
                  <UButton
                    size="sm"
                    variant="outline"
                    color="primary"
                    @click="openEditModal(user)"
                  >
                    Chỉnh sửa
                  </UButton>
                </td>
              </tr>
              <tr v-if="users.length === 0 && !loading">
                <td
                  colspan="5"
                  class="px-4 py-8 text-center text-sm text-slate-500"
                >
                  Không tìm thấy người dùng.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <!-- <UModal v-model="editModal">
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Chỉnh sửa người dùng</h3>
            <p class="text-sm text-slate-500">{{ currentUser?.name }}</p>
          </template>

          <form @submit.prevent="saveUser" class="space-y-4">
            <UFormField label="Vai trò">
              <USelect v-model="editForm.role" :options="[
                { label: 'Khách hàng', value: 'customer' },
                { label: 'Nhân viên', value: 'employee' },
                { label: 'Admin', value: 'admin' }
              ]" />
            </UFormField>

            <UFormField label="Credits">
              <UInput v-model="editForm.credits" type="number" min="0" />
            </UFormField>

            <div class="flex justify-end gap-2 pt-4">
              <UButton variant="outline" @click="editModal = false">Hủy</UButton>
              <UButton type="submit" color="primary" :loading="isSaving">Lưu thay đổi</UButton>
            </div>
          </form>
        </UCard>
      </UModal> -->
    </template>
  </UDashboardPanel>
</template>
