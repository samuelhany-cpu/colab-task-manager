"use client";

import { cn } from "@/lib/cn";

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user?: {
    id: string;
    email: string;
  };
}

interface MessageReactionsProps {
  reactions: Reaction[];
  currentUserId: string;
  onReactionToggle: (emoji: string) => void;
}

export default function MessageReactions({
  reactions,
  currentUserId,
  onReactionToggle,
}: MessageReactionsProps) {
  // Group reactions by emoji
  const groupedReactions = reactions.reduce(
    (acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push(reaction);
      return acc;
    },
    {} as Record<string, Reaction[]>,
  );

  if (Object.keys(groupedReactions).length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(groupedReactions).map(([emoji, emojiReactions]) => {
        const hasUserReacted = emojiReactions.some(
          (r) => r.userId === currentUserId,
        );
        const count = emojiReactions.length;
        const users = emojiReactions
          .map((r) => r.user?.email || "Unknown")
          .join(", ");

        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onReactionToggle(emoji)}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all",
              hasUserReacted
                ? "bg-primary/10 border border-primary/30 text-primary"
                : "bg-muted border border-border hover:bg-muted/80",
            )}
            title={users}
          >
            <span>{emoji}</span>
            <span className="font-medium">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
