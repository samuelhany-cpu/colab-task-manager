"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/components/providers/user-provider";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface GroupDMModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceSlug: string;
  onCreated: (conversation: ConversationWithMembers) => void;
}

interface WorkspaceUser {
  userId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
  };
}

interface ConversationWithMembers {
  id: string;
  name?: string | null;
  members: {
    userId: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  }[];
}

export default function GroupDMModal({
  isOpen,
  onClose,
  workspaceId,
  workspaceSlug,
  onCreated,
}: GroupDMModalProps) {
  const { user } = useUser();
  const [members, setMembers] = useState<WorkspaceUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen && workspaceId) {
      const fetchMembers = async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/workspaces/${workspaceSlug}/members`);
          if (res.ok) {
            const data: WorkspaceUser[] = await res.json();
            // Filter out self
            const others = data.filter(
              (m: WorkspaceUser) => m.userId !== user?.id,
            );
            setMembers(others);
          }
        } catch (error: unknown) {
          console.error("Failed to fetch members", error);
        } finally {
          setLoading(false);
        }
      };
      fetchMembers();
      setSelectedUserIds([]);
      setGroupName("");
    }
  }, [isOpen, workspaceId, workspaceSlug, user?.id]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleCreate = async () => {
    if (selectedUserIds.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          userIds: selectedUserIds,
          name: groupName.trim() || undefined,
        }),
      });

      if (res.ok) {
        const conversation = await res.json();
        onCreated(conversation);
        onClose();
      }
    } catch (e) {
      console.error("Create failed", e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Group Name (Optional)</Label>
            <Input
              placeholder="e.g. Frontend Team"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Select Members</Label>
            <div className="border rounded-md max-h-[200px] overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="animate-spin text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <div className="text-sm text-center text-muted-foreground py-4">
                  No other members found.
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member.userId}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors",
                      selectedUserIds.includes(member.userId) &&
                        "bg-primary/10",
                    )}
                    onClick={() => toggleUser(member.userId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs">
                        {(member.user.name || "U")[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {member.user.name || member.user.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {member.user.email}
                        </span>
                      </div>
                    </div>
                    {selectedUserIds.includes(member.userId) && (
                      <Check size={16} className="text-primary" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || selectedUserIds.length === 0}
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
