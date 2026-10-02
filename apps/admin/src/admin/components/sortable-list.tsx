import { ArrowDownMini, ArrowUpMini, DotsSix } from "@medusajs/icons";
import { clx, IconButton } from "@medusajs/ui";
import { type ReactNode, useState } from "react";
import { t } from "../lib/i18n";

interface SortableListProps<T> {
  items: readonly T[];
  itemKey: (item: T) => string;
  /** Called with the dragged index and its drop position. */
  onMove: (from: number, to: number) => void;
  children: (item: T, index: number) => ReactNode;
  disabled?: boolean;
}

/**
 * Vertical list reordered by drag and drop (native HTML5, no library) or,
 * for keyboard and touch users, with the up/down buttons of each row.
 */
export function SortableList<T>({
  items,
  itemKey,
  onMove,
  children,
  disabled = false,
}: SortableListProps<T>) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const reset = () => {
    setDragging(null);
    setOver(null);
  };

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li
          key={itemKey(item)}
          draggable={!disabled}
          onDragStart={(event) => {
            setDragging(index);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", String(index));
          }}
          onDragOver={(event) => {
            if (dragging === null) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setOver(index);
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (dragging !== null && dragging !== index) onMove(dragging, index);
            reset();
          }}
          onDragEnd={reset}
          className={clx(
            "bg-ui-bg-base border-ui-border-base flex items-center gap-3 rounded-lg border p-3 transition-colors",
            over === index && dragging !== index && "border-ui-border-interactive bg-ui-bg-subtle",
            dragging === index && "opacity-50",
          )}
        >
          <DotsSix
            className={clx("text-ui-fg-muted shrink-0", !disabled && "cursor-grab")}
            aria-hidden
          />
          <div className="min-w-0 flex-1">{children(item, index)}</div>
          <div className="flex shrink-0 gap-1">
            <IconButton
              type="button"
              size="small"
              variant="transparent"
              disabled={disabled || index === 0}
              aria-label={t("sortable.up")}
              onClick={() => onMove(index, index - 1)}
            >
              <ArrowUpMini />
            </IconButton>
            <IconButton
              type="button"
              size="small"
              variant="transparent"
              disabled={disabled || index === items.length - 1}
              aria-label={t("sortable.down")}
              onClick={() => onMove(index, index + 1)}
            >
              <ArrowDownMini />
            </IconButton>
          </div>
        </li>
      ))}
    </ul>
  );
}
