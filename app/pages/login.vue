<script setup lang="ts">
import { watchEffect } from "vue";
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Đăng nhập",
  description: "Đăng nhập vào tài khoản của bạn để tiếp tục",
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
    name: "email",
    type: "text" as const,
    label: "Email",
    placeholder: "example@example.com",
    required: true,
  },
  {
    name: "password",
    label: "Mật khẩu",
    placeholder: "Nhập mật khẩu của bạn",
    type: "password" as const,
  },
  {
    name: "remember",
    label: "Ghi nhớ tôi",
    type: "checkbox" as const,
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
  email: z.email("Email không hợp lệ"),
  password: z.string().min(6, "Phải có ít nhất 6 ký tự"),
});

type Schema = z.output<typeof schema>;

const isLoading = ref(false);

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  isLoading.value = true;
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: payload.data.email,
      password: payload.data.password,
    });

    if (error) {
      toast.add({
        title: "Lỗi đăng nhập",
        description: error.message,
        color: "error",
      });
      return;
    }

    toast.add({
      title: "Đăng nhập thành công",
      description: "Chào mừng bạn trở lại!",
    });

    await router.push("/dashboard");
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
    title="Chào mừng trở lại"
    icon="i-lucide-lock"
    :loading="isLoading"
    @submit="onSubmit"
  >
    <template #description>
      Chưa có tài khoản?
      <ULink to="/signup" class="text-primary font-medium">Đăng ký</ULink>.
    </template>

    <template #password-hint>
      <ULink to="/" class="text-primary font-medium" tabindex="-1"
        >Quên mật khẩu?</ULink
      >
    </template>

    <!-- <template #footer>
      By signing in, you agree to our <ULink
        to="/"
        class="text-primary font-medium"
      >Terms of Service</ULink>.
    </template> -->
  </UAuthForm>
</template>
