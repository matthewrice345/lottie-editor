import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SidebarItemProps extends React.HTMLAttributes<HTMLDivElement> {
  text: string;
  children: React.ReactNode;
  onRename?: (newName: string) => void;
}

export const SidebarItem = ({
  text,
  children,
  className,
  onRename,
  onClick,
  onDoubleClick,
  ...props
}: SidebarItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = (e: React.MouseEvent<HTMLDivElement>) => {
    onDoubleClick?.(e);
    if (!onRename) return;
    e.stopPropagation();
    e.preventDefault();
    setDraft(text);
    setIsEditing(true);
  };

  const commit = () => {
    const trimmed = draft.trim();
    setIsEditing(false);
    if (!trimmed || trimmed === text) return;
    onRename?.(trimmed);
  };

  const cancel = () => {
    setIsEditing(false);
    setDraft(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md bg-background px-3 py-2 hover:bg-muted cursor-pointer border",
        className,
      )}
      onClick={isEditing ? (e) => e.stopPropagation() : onClick}
      onDoubleClick={onRename ? startEditing : onDoubleClick}
      {...props}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {children}
        {isEditing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commit}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-medium bg-transparent outline-none ring-1 ring-primary rounded px-1 -mx-1 min-w-0 flex-1"
          />
        ) : (
          <span className="text-sm font-medium truncate">{text}</span>
        )}
      </div>
    </div>
  );
};
