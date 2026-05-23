import { defineStore } from "pinia";
import { type Profile, type Order } from "~/types";

export const useOrdersStore = defineStore("orders", () => {
  const supabase = useSupabaseClient();
  const { profile } = useUser();
  const toast = useToast();
  const { playSound } = useNotificationSound();

  const orders = ref<Order[]>([]);
  const loading = ref(false);

  const fetchOrders = async () => {
    loading.value = true;
    try {
      let query;

      if (profile.value?.role === "customer") {
        query = supabase
          .from("orders")
          .select(`*, documents(*), reports(*)`)
          .eq("user_id", profile.value.id);
      } else {
        query = supabase
          .from("orders")
          .select(
            `*, documents(*), customer:profiles!orders_user_id_fkey(*), assignee:profiles!orders_assigned_to_fkey(*), reports(*)`,
          );
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      }).limit(200);

      if (error) throw error;
      orders.value = (data as unknown as Order[]) || [];
    } finally {
      loading.value = false;
    }
  };

  const assignOrder = async (orderId: string) => {
    if (!profile.value || profile.value.role !== "employee") return;

    const { error } = await supabase
      .from("orders")
      .update({ assigned_to: profile.value.id, status: "processing" })
      .eq("id", orderId)
      .is("assigned_to", null);

    if (error) throw error;
    await fetchOrders();
  };

  const submitReport = async (
    orderId: string,
    aiScore: number,
    similarityScore: number,
    notes?: string,
  ) => {
    if (
      !profile.value ||
      (profile.value.role !== "employee" && profile.value.role !== "admin")
    ) {
      throw new Error("Unauthorized");
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("assigned_to")
      .eq("id", orderId)
      .single();

    if (orderError) throw orderError;
    if (!order || order.assigned_to !== profile.value.id) {
      throw new Error("Order not assigned to you");
    }

    const { error } = await supabase.from("reports").insert({
      order_id: orderId,
      ai_score: aiScore,
      similarity_score: similarityScore,
      details: notes ? { notes } : null,
    });

    if (error) throw error;

    await supabase
      .from("orders")
      .update({ status: "completed" })
      .eq("id", orderId);

    await fetchOrders();
  };

  const downloadDocument = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .download(filePath);

    if (error) throw error;

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  let activeChannel: any = null;

  const subscribeToOrders = () => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }

    const role = profile.value?.role;

    const fetchSingleOrder = async (id: string) => {
      let query;
      if (profile.value?.role === "customer") {
        query = supabase
          .from("orders")
          .select(`*, documents(*), reports(*)`)
          .eq("id", id);
      } else {
        query = supabase
          .from("orders")
          .select(
            `*, documents(*), customer:profiles!orders_user_id_fkey(*), assignee:profiles!orders_assigned_to_fkey(*), reports(*)`,
          )
          .eq("id", id);
      }
      const { data } = await query.single();
      return data as Order | null;
    };

    const updateLocalOrder = (updatedOrder: Order | null) => {
      if (!updatedOrder) return;
      const idx = orders.value.findIndex((o) => o.id === updatedOrder.id);
      if (idx !== -1) {
        orders.value[idx] = updatedOrder;
      } else {
        orders.value.unshift(updatedOrder);
      }
    };

    const channelName = `orders-${profile.value?.id ?? "anon"}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
      },
      async (payload: any) => {
        const orderId = payload.new?.id || payload.old?.id;
        if (!orderId) return;

        if (payload.eventType === "DELETE") {
          orders.value = orders.value.filter((o) => o.id !== orderId);
          return;
        }

        const updatedOrder = await fetchSingleOrder(orderId);
        // Customer logic
        if (role === "customer") {
          if (payload.new?.user_id !== profile.value!.id && payload.old?.user_id !== profile.value!.id) {
            return; // Not my order
          }
          
          let didStatusChange = false;
          let newStatus = '';
          
          if (payload.eventType === "UPDATE") {
            // Because of race conditions with the `reports` subscription (which might call fetchOrders early), 
            // we reliably check the payload itself instead of the local store.
            if (payload.old?.status && payload.old.status !== payload.new.status) {
              didStatusChange = true;
              newStatus = payload.new.status;
            }
          }

          updateLocalOrder(updatedOrder);

          if (didStatusChange) {
            const updatedOrder = orders.value.find((o) => o.id === payload.new.id);
            const fileName = updatedOrder?.documents?.original_filename ?? 'Tài liệu';
            
            playSound();
            
            if (newStatus === "completed") {
              toast.add({
                title: "Đơn hàng hoàn tất",
                description: `${fileName} đã được kiểm tra xong.`,
                color: "success",
              });
            } else if (newStatus === "processing") {
              toast.add({
                title: "Đang xử lý",
                description: `${fileName} đang được nhân viên xử lý.`,
                color: "info",
              });
            }
          }
        }

        // Employee logic
        if (role === "employee") {
          const isAssignedToMe = payload.new?.assigned_to === profile.value!.id || payload.old?.assigned_to === profile.value!.id;
          const isNewUnassigned = payload.eventType === "INSERT" && payload.new?.assigned_to === null;
          
          if (isAssignedToMe || isNewUnassigned) {
            updateLocalOrder(updatedOrder);
            
            if (isNewUnassigned) {
              const newOrder = orders.value.find((o) => o.id === payload.new.id);
              const fileName = newOrder?.documents?.original_filename ?? 'Tài liệu mới';
              const typeMap: Record<string, string> = { ai: 'AI', similarity: 'Đạo văn', combo: 'Combo' };
              const typeLabel = newOrder?.check_type ? typeMap[newOrder.check_type] : '';
              
              playSound();
              toast.add({
                title: "Đơn mới",
                description: `${fileName} ${typeLabel ? `(${typeLabel})` : ''} cần được xử lý`,
              });
            }
          }
        }

        // Admin logic
        if (role === "admin") {
          updateLocalOrder(updatedOrder);
        }
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "reports",
      },
      async (payload: any) => {
        const orderId = payload.new?.order_id || payload.old?.order_id;
        if (orderId) {
          const updatedOrder = await fetchSingleOrder(orderId);
          updateLocalOrder(updatedOrder);
        }
      },
    );

    channel.subscribe((status) => {
      console.log("Realtime:", status);
    });

    activeChannel = channel;

    return () => {
      if (activeChannel === channel) {
        supabase.removeChannel(channel);
        activeChannel = null;
      }
    };
  };

  const unassignedCount = computed<number>(() =>
    orders.value.filter((o) => !o.assigned_to && o.status !== "completed").length,
  );

  return {
    orders,
    loading,
    fetchOrders,
    assignOrder,
    submitReport,
    downloadDocument,
    subscribeToOrders,
    unassignedCount,
  };
});
