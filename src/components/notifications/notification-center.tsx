"use client";

import { useEffect, useState, useRef } from "react";
import {
  Bell, AlertTriangle, CheckCircle, Zap, Wifi, X,
  Loader2, CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/lib/store";
import {
  getNotifications, markNotificationRead,
  markAllNotificationsRead, deleteNotification,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import type { Notification } from "@/lib/types";
import { toast } from "sonner";

const NOTIFICATION_ICONS: Record<string, { icon: typeof Bell; className: string }> = {
  agent_error: { icon: AlertTriangle, className: "text-red-500" },
  task_complete: { icon: CheckCircle, className: "text-emerald-500" },
  webhook_trigger: { icon: Zap, className: "text-amber-500" },
  agent_online: { icon: Wifi, className: "text-emerald-500" },
  system: { icon: Bell, className: "text-blue-500" },
};

function getNotificationIcon(type: string) {
  return NOTIFICATION_ICONS[type] ?? NOTIFICATION_ICONS.system;
}

export function NotificationCenter() {
  const { notifications, setNotifications, unreadCount, setUnreadCount } = useStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  async function loadNotifications() {
    setLoading(true);
    try {
      const data = await getNotifications(false, 20);
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch {
      // Silent fail on initial load
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await markNotificationRead(id);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch {
      toast.error("Failed to mark notification as read");
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  }

  async function handleDelete(id: string) {
    try {
      const notification = notifications.find((n) => n.id === id);
      await deleteNotification(id);
      setNotifications(notifications.filter((n) => n.id !== id));
      if (notification && !notification.is_read) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch {
      toast.error("Failed to delete notification");
    }
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      handleMarkRead(notification.id);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => {
          setOpen(!open);
          if (!open) loadNotifications();
        }}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] rounded-lg border border-border bg-popover shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </div>

          <Separator />

          {/* Notification list */}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="divide-y divide-border">
                {notifications.map((notification) => {
                  const { icon: Icon, className: iconClass } = getNotificationIcon(notification.type);
                  const isHovered = hoveredId === notification.id;

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent/30",
                        !notification.is_read && "bg-accent/10",
                      )}
                      onClick={() => handleNotificationClick(notification)}
                      onMouseEnter={() => setHoveredId(notification.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* Icon */}
                      <div className="mt-0.5 shrink-0">
                        <Icon className={cn("h-4 w-4", iconClass)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm truncate",
                              !notification.is_read ? "font-semibold" : "font-medium",
                            )}
                          >
                            {notification.title}
                          </span>
                          {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          )}
                        </div>
                        {notification.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        <span className="text-[10px] text-muted-foreground mt-1 block">
                          {timeAgo(notification.created_at)}
                        </span>
                      </div>

                      {/* Delete button (on hover) */}
                      {isHovered && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification.id);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
