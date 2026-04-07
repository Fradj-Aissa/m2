import axios from "axios";
import { API_BASE_URL } from "@/lib/api";

export type PlanName = "Free" | "Basic" | "Pro";

export interface Subscription {
  id: string;
  user_id: string;
  plan_name: PlanName;
  price: number;
  receipt_image?: string | null;
  status: "pending" | "active" | "expired" | "rejected";
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
}

export async function requestSubscription(plan: PlanName, receipt: File) {
  const form = new FormData();
  form.append("plan_name", plan);
  form.append("receipt", receipt);

  const apiBase = API_BASE_URL.replace(/\/+$/, "");
  const token = localStorage.getItem("token");
  const response = await axios.post<{ subscription: Subscription }>(
    `${apiBase}/subscriptions/request`,
    form,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      withCredentials: false,
    }
  );

  return response.data.subscription;
}

export async function fetchPendingSubscriptions() {
  const token = localStorage.getItem("token");
  const apiBase = API_BASE_URL.replace(/\/+$/, "");
  const response = await axios.get<Subscription[]>(
    `${apiBase}/subscriptions/admin/pending`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  return response.data;
}

export async function approveSubscription(id: string) {
  const token = localStorage.getItem("token");
  const apiBase = API_BASE_URL.replace(/\/+$/, "");
  const response = await axios.patch<{ subscription: Subscription }>(
    `${apiBase}/subscriptions/admin/${id}/approve`,
    {},
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  return response.data.subscription;
}

export async function rejectSubscription(id: string) {
  const token = localStorage.getItem("token");
  const apiBase = API_BASE_URL.replace(/\/+$/, "");
  const response = await axios.patch<{ subscription: Subscription }>(
    `${apiBase}/subscriptions/admin/${id}/reject`,
    {},
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  return response.data.subscription;
}
