import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/api";
import {
  AppNotification,
  fetchNotifications,
  markNotificationAsRead,
} from "@/services/notificationService";

interface SocketContextType {
  socket: Socket | null;
  notifications: AppNotification[];
  unreadCount: number;
  loadingNotifications: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
}

const SocketContext = createContext<SocketContextType | null>(null);

const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

function getUnreadCount(notifications: AppNotification[]) {
  return notifications.filter((notification) => !notification.is_read).length;
}

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  const refreshNotifications = async () => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      setLoadingNotifications(false);
      return;
    }

    setLoadingNotifications(true);

    try {
      const nextNotifications = await fetchNotifications();
      setNotifications(nextNotifications);
      setUnreadCount(getUnreadCount(nextNotifications));
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!currentUser) {
      return;
    }

    try {
      await markNotificationAsRead(notificationId);
      setNotifications((currentNotifications) => {
        const nextNotifications = currentNotifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        );

        setUnreadCount(getUnreadCount(nextNotifications));
        return nextNotifications;
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    async function loadNotifications() {
      if (!currentUser) {
        setNotifications([]);
        setUnreadCount(0);
        setLoadingNotifications(false);
        return;
      }

      setLoadingNotifications(true);

      try {
        const nextNotifications = await fetchNotifications();

        if (!isCancelled) {
          setNotifications(nextNotifications);
          setUnreadCount(getUnreadCount(nextNotifications));
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to fetch notifications:", error);
        }
      } finally {
        if (!isCancelled) {
          setLoadingNotifications(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      isCancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      socket?.disconnect();
      setSocket(null);
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    const socketInstance = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: {
        token,
        userId: currentUser.uid,
      },
    });

    setSocket(socketInstance);

    socketInstance.on("new_notification", (notification: AppNotification) => {
      setNotifications((currentNotifications) => {
        if (currentNotifications.some((item) => item.id === notification.id)) {
          return currentNotifications;
        }

        const nextNotifications = [notification, ...currentNotifications];
        setUnreadCount(getUnreadCount(nextNotifications));
        return nextNotifications;
      });
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [currentUser]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        unreadCount,
        loadingNotifications,
        refreshNotifications,
        markAsRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }

  return context;
};
