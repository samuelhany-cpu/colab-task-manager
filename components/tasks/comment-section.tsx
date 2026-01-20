"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Send, Loader2, User, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import UserProfileModal from "@/components/users/user-profile-modal";

interface Author {
  id: string;
  name: string | null;
  image?: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
}

interface ProjectMember {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface CommentSectionProps {
  taskId: string;
  projectId: string;
}

export default function CommentSection({
  taskId,
  projectId,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (e) {
      console.error("Failed to fetch comments:", e);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (e) {
      console.error("Failed to fetch members:", e);
    }
  }, [projectId]);

  useEffect(() => {
    fetchComments();
    fetchMembers();
  }, [fetchComments, fetchMembers]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newComment.trim() || sending) return;

    try {
      setSending(true);
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });

      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [...prev, comment]);
        setNewComment("");
      }
    } catch (e) {
      console.error("Failed to send comment:", e);
    } finally {
      setSending(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart;
    setNewComment(value);
    setCursorPos(pos);

    // Mention logic
    const lastAt = value.lastIndexOf("@", pos - 1);
    if (lastAt !== -1 && !value.slice(lastAt, pos).includes(" ")) {
      setMentionSearch(value.slice(lastAt + 1, pos));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member: ProjectMember) => {
    const lastAt = newComment.lastIndexOf("@", cursorPos - 1);
    const before = newComment.slice(0, lastAt);
    const after = newComment.slice(cursorPos);
    const mentionText = `@[${member.user.name || member.user.email}](${member.user.id})`;

    setNewComment(`${before}${mentionText} ${after}`);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const filteredMembers = members.filter((m) =>
    (m.user.name || m.user.email || "")
      .toLowerCase()
      .includes(mentionSearch.toLowerCase()),
  );

  const renderContent = (content: string) => {
    // Regex for: @[Name](userId)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const result = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(content)) !== null) {
      // Normal text before mention
      result.push(content.substring(lastIndex, match.index));
      // Mention with badge
      result.push(
        <button
          key={match![2] + match?.index}
          onClick={() => {
            setSelectedUserId(match![2]);
            setIsProfileModalOpen(true);
          }}
          className="hover:scale-110 transition-transform active:scale-95 inline-block"
        >
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary border-none text-[10px] font-bold mx-0.5 cursor-pointer"
          >
            @{match![1]}
          </Badge>
        </button>,
      );
      lastIndex = mentionRegex.lastIndex;
    }
    result.push(content.substring(lastIndex));

    return result;
  };

  if (loading)
    return (
      <div className="p-4 flex justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4 group">
            <div className="flex-shrink-0">
              {comment.author.image ? (
                <img
                  src={comment.author.image}
                  className="w-8 h-8 rounded-lg"
                  alt=""
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-mutedForeground">
                  <User size={16} />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider">
                  {comment.author.name || "User"}
                </span>
                <span className="text-[10px] text-mutedForeground font-bold">
                  {formatDistanceToNow(new Date(comment.createdAt))} ago
                </span>
              </div>
              <div className="text-sm font-medium text-foreground leading-relaxed">
                {renderContent(comment.content)}
              </div>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="py-8 text-center text-mutedForeground text-xs italic font-medium">
            No comments yet. Start the conversation!
          </div>
        )}
      </div>

      <div className="relative pt-4 border-t border-border">
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-10 animate-in slide-in-from-bottom-2">
            <div className="p-2 border-b border-border bg-muted/50">
              <span className="text-[10px] font-black uppercase tracking-widest text-mutedForeground">
                Mention Member
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar">
              {filteredMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => insertMention(m)}
                  className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-3 transition-colors"
                >
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <UserPlus size={12} />
                  </div>
                  <div className="flex-1 truncate">
                    <p className="text-xs font-bold truncate">
                      {m.user.name || "Anonymous"}
                    </p>
                    <p className="text-[9px] text-mutedForeground truncate">
                      {m.user.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={handleSend} className="relative">
          <textarea
            ref={textareaRef}
            placeholder="Write a comment... (use @ to mention)"
            value={newComment}
            onChange={handleTextareaChange}
            className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none min-h-[100px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || sending}
            className="absolute right-3 bottom-3 p-2 bg-primary text-primary-foreground rounded-lg shadow-soft hover:brightness-110 active:scale-95 disabled:opacity-30 transition-all"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </form>
      </div>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userId={selectedUserId}
      />
    </div>
  );
}
