<script setup lang="ts">
import { watchEffect } from "vue";
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Đăng ký",
  description: "Tạo tài khoản để bắt đầu",
});

const supabase = useSupabaseClient();
const toast = useToast();
const router = useRouter();
const user = useSupabaseUser();

watchEffect(() => {
  if (user.value) {
    router.replace("/dashboard");
  }
});

const fields = [
  {
    name: "name",
    type: "text" as const,
    label: "Tên",
    placeholder: "Nhập tên của bạn (không bắt buộc)",
    required: false,
  },
  {
    name: "email",
    type: "text" as const,
    label: "Email",
    placeholder: "Nhập email của bạn",
    required: true,
  },
  {
    name: "password",
    label: "Mật khẩu",
    type: "password" as const,
    placeholder: "Nhập mật khẩu của bạn",
    required: true,
  },
];

const providers = [
  {
    label: "Google",
    icon: "i-simple-icons-google",
    onClick: () => {
      supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
    },
  },
];

const schema = z.object({
  name: z.string().optional(),
  email: z.email("Email không hợp lệ"),
  password: z.string().min(6, "Phải có ít nhất 6 ký tự"),
});

type Schema = z.output<typeof schema>;

const isLoading = ref(false);

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  isLoading.value = true;
  try {
    const { error } = await supabase.auth.signUp({
      email: payload.data.email,
      password: payload.data.password,
      options: {
        data: {
          name: payload.data.name,
        },
      },
    });

    if (error) {
      toast.add({
        title: "Lỗi đăng ký",
        description: error.message,
        color: "error",
      });
      return;
    }

    toast.add({
      title: "Đăng ký thành công",
      description: "Vui lòng kiểm tra email để xác nhận tài khoản",
    });

    await router.push("/login");
  } catch (err) {
    toast.add({
      title: "Lỗi",
      description: "Có lỗi xảy ra, vui lòng thử lại",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <UAuthForm
    :fields="fields"
    :schema="schema"
    :providers="providers"
    title="Tạo tài khoản"
    :submit="{ label: 'Tạo tài khoản' }"
    :loading="isLoading"
    @submit="onSubmit"
  >
    <template #description>
      Đã có tài khoản?
      <ULink to="/login" class="text-primary font-medium">Đăng nhập</ULink>.
    </template>

    <!-- <template #footer>
      By signing up, you agree to our <ULink
        to="/"
        class="text-primary font-medium"
      >Terms of Service</ULink>.
    </template> -->
  </UAuthForm>
</template>
