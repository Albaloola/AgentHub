"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  X,
  Shield,
  Eye,
  Pencil,
  Crown,
  Loader2,
  Lock,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getConversationPermissions,
  addConversationPermission,
  removeConversationPermission,
  getUsers,
} from "@/lib/api";
import type {
  ConversationPermissionWithUser,
  PermissionLevel,
  UserAccount,
} from "@/lib/types";
import { toast } from "sonner";

interface ShareDialogProps {
  conversationId: string;
  conversationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PERMISSION_META: Record<
  PermissionLevel,
  { label: string; icon: typeof Eye; description: string }
> = {
  viewer: {
    label: "Viewer",
    icon: Eye,
    description: "Can read messages",
  },
  editor: {
    label: "Editor",
    icon: Pencil,
    description: "Can read and send messages",
  },
  admin: {
    label: "Admin",
    icon: Crown,
    description: "Full control including sharing",
  },
};

export function ShareDialog({
  conversationId,
  conversationName,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const [permissions, setPermissions] = useState<
    ConversationPermissionWithUser[]
  >([]);
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUser, setAddingUser] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Add-user form state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newPermission, setNewPermission] = useState<PermissionLevel>("viewer");
  const searchRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [perms, users] = await Promise.all([
        getConversationPermissions(conversationId),
        getUsers(),
      ]);
      setPermissions(perms);
      setAllUsers(users);
    } catch {
      toast.error("Failed to load sharing data");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (open) {
      loadData();
      setSearchQuery("");
      setSelectedUserId(null);
      setNewPermission("viewer");
    }
  }, [open, loadData]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const existingUserIds = new Set(permissions.map((p) => p.user_id));

  const filteredUsers = allUsers.filter((u) => {
    if (existingUserIds.has(u.id)) return false;
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    return (
      u.display_name.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  const selectedUser = allUsers.find((u) => u.id === selectedUserId);

  async function handleAdd() {
    if (!selectedUserId) return;
    setAddingUser(true);
    try {
      const result = await addConversationPermission(
        conversationId,
        selectedUserId,
        newPermission,
      );
      setPermissions((prev) => [...prev, result]);
      setSearchQuery("");
      setSelectedUserId(null);
      setNewPermission("viewer");
      toast.success("User added");
    } catch {
      toast.error("Failed to add user");
    } finally {
      setAddingUser(false);
    }
  }

  async function handleRemove(userId: string) {
    setRemovingUserId(userId);
    try {
      await removeConversationPermission(conversationId, userId);
      setPermissions((prev) => prev.filter((p) => p.user_id !== userId));
      toast.success("Access removed");
    } catch {
      toast.error("Failed to remove access");
    } finally {
      setRemovingUserId(null);
    }
  }

  async function handleChangePermission(
    userId: string,
    level: PermissionLevel,
  ) {
    setUpdatingUserId(userId);
    try {
      await addConversationPermission(conversationId, userId, level);
      setPermissions((prev) =>
        prev.map((p) =>
          p.user_id === userId ? { ...p, permission: level } : p,
        ),
      );
    } catch {
      toast.error("Failed to update permission");
    } finally {
      setUpdatingUserId(null);
    }
  }

  const isShared = permissions.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Share Conversation
          </DialogTitle>
          <DialogDescription>
            Manage who has access to &ldquo;{conversationName}&rdquo;
          </DialogDescription>
        </DialogHeader>

        {/* Status indicator */}
        <div className="flex items-center gap-2 rounded-lg bg-foreground/[0.05] px-3 py-2">
          {isShared ? (
            <>
              <Globe className="h-3.5 w-3.5 text-[var(--accent-blue)]" />
              <span className="text-xs text-muted-foreground">
                Shared with {permissions.length}{" "}
                {permissions.length === 1 ? "user" : "users"}
              </span>
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Private &mdash; only you have access
              </span>
            </>
          )}
        </div>

        {/* Add user section */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Add people
          </label>
          <div className="flex items-center gap-2">
            <div ref={searchRef} className="relative flex-1">
              {selectedUser ? (
                <div className="flex items-center gap-1.5 h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
                  <span className="truncate">
                    {selectedUser.display_name}
                  </span>
                  {selectedUser.email && (
                    <span className="text-muted-foreground text-xs truncate">
                      ({selectedUser.email})
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSelectedUserId(null);
                      setSearchQuery("");
                    }}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="h-8 text-sm"
                />
              )}

              {/* Suggestions dropdown */}
              {showSuggestions &&
                !selectedUserId &&
                searchQuery.trim() &&
                filteredUsers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-popover shadow-[var(--panel-shadow)]">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-foreground/[0.04] transition-colors"
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setSearchQuery(user.display_name);
                          setShowSuggestions(false);
                        }}
                      >
                        <UserPlus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-xs">
                            {user.display_name}
                          </div>
                          {user.email && (
                            <div className="truncate text-[var(--text-label)] text-muted-foreground">
                              {user.email}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[var(--text-micro)] px-1.5 py-0 shrink-0"
                        >
                          {user.role}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}

              {showSuggestions &&
                !selectedUserId &&
                searchQuery.trim().length > 0 &&
                filteredUsers.length === 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-popover p-3 shadow-[var(--panel-shadow)]">
                    <p className="text-xs text-muted-foreground text-center">
                      No matching users found
                    </p>
                  </div>
                )}
            </div>

            <Select
              value={newPermission}
              onValueChange={(val) =>
                setNewPermission(val as PermissionLevel)
              }
            >
              <SelectTrigger size="sm" className="w-[100px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(PERMISSION_META) as [
                    PermissionLevel,
                    (typeof PERMISSION_META)[PermissionLevel],
                  ][]
                ).map(([level, meta]) => (
                  <SelectItem key={level} value={level}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              className="h-7 px-3 shrink-0"
              disabled={!selectedUserId || addingUser}
              onClick={handleAdd}
            >
              {addingUser ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </div>
        </div>

        {/* Permission list */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              People with access
            </label>
            {permissions.length > 0 && (
              <span className="text-[var(--text-label)] text-muted-foreground tabular-nums">
                {permissions.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : permissions.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-6 text-center">
              <Users className="h-5 w-5 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground/60">
                No one else has access yet
              </p>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-0.5 -mx-1 px-1">
              {permissions.map((perm) => {
                const meta = PERMISSION_META[perm.permission as PermissionLevel] ?? PERMISSION_META.viewer;
                const PermIcon = meta.icon;
                const isRemoving = removingUserId === perm.user_id;
                const isUpdating = updatingUserId === perm.user_id;

                return (
                  <div
                    key={perm.user_id}
                    className={cn(
                      "group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-foreground/[0.04]",
                      isRemoving && "opacity-50",
                    )}
                  >
                    {/* User info */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.08] text-xs font-medium">
                      {perm.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">
                        {perm.display_name}
                      </div>
                      {perm.email && (
                        <div className="truncate text-[var(--text-label)] text-muted-foreground">
                          {perm.email}
                        </div>
                      )}
                    </div>

                    {/* Permission selector */}
                    <Select
                      value={perm.permission}
                      onValueChange={(val) =>
                        handleChangePermission(
                          perm.user_id,
                          val as PermissionLevel,
                        )
                      }
                      disabled={isUpdating}
                    >
                      <SelectTrigger
                        size="sm"
                        className={cn(
                          "w-[90px] shrink-0 text-[var(--text-label)] h-6 gap-1",
                          isUpdating && "opacity-50",
                        )}
                      >
                        <PermIcon className="h-3 w-3 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.entries(PERMISSION_META) as [
                            PermissionLevel,
                            (typeof PERMISSION_META)[PermissionLevel],
                          ][]
                        ).map(([level, m]) => (
                          <SelectItem key={level} value={level}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemove(perm.user_id)}
                      disabled={isRemoving}
                      className="h-6 w-6 shrink-0 flex items-center justify-center rounded-md text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                      title="Remove access"
                    >
                      {isRemoving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Permission legend */}
        <div className="rounded-lg bg-foreground/[0.03] px-3 py-2 space-y-1">
          {(
            Object.entries(PERMISSION_META) as [
              PermissionLevel,
              (typeof PERMISSION_META)[PermissionLevel],
            ][]
          ).map(([level, meta]) => {
            const Icon = meta.icon;
            return (
              <div
                key={level}
                className="flex items-center gap-2 text-[var(--text-label)] text-muted-foreground"
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="font-medium w-12">{meta.label}</span>
                <span>{meta.description}</span>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
