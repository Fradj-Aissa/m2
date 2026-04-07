import { apiGet, apiPatch } from "@/lib/api";

export type NotificationType = "rating" | "contact" | "approval" | "system";

export interface AppNotification {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  sender_name?: string | null;
  sender_photo?: string | null;
  type: NotificationType;
  apartment_id: string | null;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export async function fetchNotifications() {
  return apiGet<AppNotification[]>("/notifications");
}

export async function markNotificationAsRead(notificationId: string) {
  return apiPatch<AppNotification>(`/notifications/${notificationId}/read`, {});
}
