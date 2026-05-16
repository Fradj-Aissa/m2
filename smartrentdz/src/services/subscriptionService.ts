import axios from "axios";
import { API_BASE_URL } from "@/lib/api";

export type PlanName = "Free" | "Basic" | "Pro";

export interface Subscription {
  id: string;
  user_id: string;
  plan_name?: PlanName;
  price?: number;
  amount?: number;
  receipt_image?: string | null;
  receipt_path?: string | null;
  admin_feedback?: string | null;
  status: "pending" | "approved" | "rejected" | "expired";
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
}

export async function requestSubscription(_plan: PlanName, receipt: File, amount = 3900) {
  const form = new FormData();
  form.append("amount", String(amount));
  form.append("receipt", receipt);
  const apiBase = API_BASE_URL.replace(/\/+$/, "");
  const token = localStorage.getItem("token");
  const response = await axios.post<{ subscription: Subscription }>(`${apiBase}/subscriptions/upload-receipt`, form, {
    headers: { "Content-Type": "multipart/form-data", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return response.data.subscription;
}

export async function uploadIdCard(front: File, back?: File | null) {
  const form = new FormData();
  if (back) {
    form.append("id_front", front);
    form.append("id_back", back);
  } else {
    form.append("id_card", front);
  }
  const apiBase = API_BASE_URL.replace(/\/+$/, "");
  const token = localStorage.getItem("token");
  return axios.post(`${apiBase}/users/upload-id`, form, { headers: { "Content-Type": "multipart/form-data", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
}

export async function fetchPendingSubscriptions() {
  const token = localStorage.getItem("token");
  const apiBase = API_BASE_URL.replace(/\/+$/, "");
  const response = await axios.get<Subscription[]>(`${apiBase}/subscriptions/admin/pending`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return response.data;
}

export async function updateSubscriptionStatus(id: string, status: "approved" | "rejected", feedback?: string | null) {
  const token = localStorage.getItem("token");
  const apiBase = API_BASE_URL.replace(/\/+$/, "");
  const response = await axios.patch<{ subscription: Subscription }>(`${apiBase}/admin/subscriptions/${id}/status`, { status, feedback }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return response.data.subscription;
}

export async function fetchMySubscriptions() {
  const token = localStorage.getItem("token");
  const apiBase = API_BASE_URL.replace(/\/+$/, "");
  const response = await axios.get<Subscription[]>(`${apiBase}/subscriptions/mine`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return response.data;
}
