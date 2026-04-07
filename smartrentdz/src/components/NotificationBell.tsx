import { useEffect, useRef, useState } from "react";
import { Bell, Inbox, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useSocketContext } from "@/contexts/SocketContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type FilterState = "all" | "unread";

function getSenderInitials(senderName?: string | null) {
  if (!senderName) {
    return "؟";
  }

  return senderName.trim().charAt(0).toUpperCase();
}

function formatNotificationTime(dateString: string) {
  return formatDistanceToNow(new Date(dateString), {
    addSuffix: true,
    locale: ar,
  });
}

const NotificationBell = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<FilterState>("all");
  const { notifications, unreadCount, loadingNotifications, markAsRead } = useSocketContext();

  const visibleNotifications =
    filter === "unread"
      ? notifications.filter((notification) => !notification.is_read)
      : notifications;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notificationId: string, link: string | null) => {
    await markAsRead(notificationId);
    setIsOpen(false);

    if (link) {
      navigate(link);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Bell className={cn("h-5 w-5", unreadCount > 0 && "text-primary")} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {isOpen ? (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 md:w-96 max-w-[90vw] z-50 overflow-hidden rounded-2xl border bg-background shadow-2xl">
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">الإشعارات</h3>
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} غير مقروءة` : "أنت متابع لكل جديد"}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-muted p-1">
                <button
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    filter === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  )}
                  onClick={() => setFilter("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    filter === "unread"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  )}
                  onClick={() => setFilter("unread")}
                >
                  Unread
                </button>
              </div>
            </div>
          </div>

          <ScrollArea className="max-h-[26rem]">
            <div className="p-3">
              {loadingNotifications ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ تحميل الإشعارات...
                </div>
              ) : visibleNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="rounded-full bg-muted p-4 text-muted-foreground">
                    <Inbox className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-muted-foreground">لا توجد إشعارات حالياً</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-right transition-colors hover:bg-muted/70",
                        !notification.is_read && "bg-primary/5"
                      )}
                      onClick={() =>
                        handleNotificationClick(notification.id, notification.link)
                      }
                    >
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage src={notification.sender_photo || undefined} />
                        <AvatarFallback>
                          {getSenderInitials(notification.sender_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="line-clamp-2 text-sm leading-6 text-foreground">
                            {notification.sender_name ? (
                              <span className="ml-1 font-semibold">
                                {notification.sender_name}
                              </span>
                            ) : null}
                            <span>{notification.message}</span>
                          </p>
                          {!notification.is_read ? (
                            <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatNotificationTime(notification.created_at)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      ) : null}
    </div>
  );
};

export default NotificationBell;
