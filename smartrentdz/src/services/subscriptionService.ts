import axios from "axios";
import { API_BASE_URL } from "@/lib/api";

export type PlanName = "Free" | "Basic" | "Pro";

export interface Subscription {
  id: string;
  user_id: string;
  plan_name: PlanName;
  price: number;
  receipt_image?: string | null;
  admin_feedback?: string | null;
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
      withCredentials: true, // Enable credentials for cross-origin requests
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

export async function updateSubscriptionStatus(id: string, status: "active" | "rejected", feedback?: string | null) {
  const token = localStorage.getItem("token");
  const apiBase = API_BASE_URL.replace(/\/+$/, "");
  
  try {
    // Build the correct URL - apiBase already contains /api
    const url = `${apiBase}/admin/subscriptions/${id}/status`;
    console.log("Calling updateSubscriptionStatus with URL:", url, { status, feedback });
    
    const response = await axios.patch<{ subscription: Subscription }>(
      url,
      { status, feedback },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    console.log("Success response:", response.data);
    return response.data.subscription;
  } catch (err: any) {
    console.error("Full Error in updateSubscriptionStatus:", {
      message: err?.message,
      response: err?.response?.data,
      status: err?.response?.status,
      fullError: err
    });
    const message = err?.response?.data?.error || err?.message || "Server error";
    throw new Error(message);
  }
}

export async function fetchMySubscriptions() {
  const token = localStorage.getItem("token");
  const apiBase = API_BASE_URL.replace(/\/+$/, "");
  const response = await axios.get<Subscription[]>(`${apiBase}/subscriptions/mine`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
}
