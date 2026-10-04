import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Application } from "../api";
import {
  columnOf,
  moveCard,
  positionAt,
  toColumns,
  type Columns,
} from "../board";
import { PATH, STAGE_LABEL, STAGES, type Stage } from "../stages";
import { AppCardBody, cardClass } from "./AppCard";
import { ClosedZone, Column } from "./Column";

interface BoardProps {
  items: Application[];
  onOpen: (id: string) => void;
  onMove: (id: string, stage: Stage, position: number) => void;
}

function describe(app: Application | undefined): string {
  return app ? `${app.job.title} at ${app.job.company}` : "The application";
}

/** The kanban: drag cards along the path, or Space to pick one up and arrows to move it. */
export function Board({ items, onOpen, onMove }: BoardProps) {
  const [columns, setColumns] = useState<Columns>(() => toColumns(items));
  const [active, setActive] = useState<string | null>(null);
  const lastDrop = useRef(0);
  const byId = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  // Follow the server's board, except mid-drag. Ending a drag doesn't reset the
  // columns by itself: the dropped card stays put until the board catches up.
  const dragging = useRef(false);
  useEffect(() => {
    if (!dragging.current) setColumns(toColumns(items));
  }, [items]);

  // Left and Right jump straight to the neighbouring stage; Up and Down move within one.
  const latest = useRef(columns);
  latest.current = columns;
  const keyboardCoordinates = useMemo<KeyboardCoordinateGetter>(
    () => (event, args) => {
      const sideways =
        event.code === "ArrowLeft" || event.code === "ArrowRight";
      const { active: dragging, droppableRects } = args.context;
      if (!sideways || !dragging)
        return sortableKeyboardCoordinates(event, args);
      const here = columnOf(latest.current, String(dragging.id));
      const next = here
        ? STAGES[STAGES.indexOf(here) + (event.code === "ArrowRight" ? 1 : -1)]
        : undefined;
      const rect = next ? droppableRects.get(`column:${next}`) : undefined;
      event.preventDefault();
      return rect ? { x: rect.left + 10, y: rect.top + 10 } : undefined;
    },
    [],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinates,
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space", "Enter"],
      },
    }),
  );

  const stageName = (id: string | number | undefined) => {
    if (id === undefined) return "";
    const stage = columnOf(columns, String(id));
    return stage ? STAGE_LABEL[stage] : "";
  };
  const announcements: Announcements = {
    onDragStart: ({ active: a }) =>
      `Picked up ${describe(byId.get(String(a.id)))}. Use the arrow keys to move it, Space to drop, Escape to cancel.`,
    onDragOver: ({ active: a, over }) =>
      over
        ? `${describe(byId.get(String(a.id)))} is over ${stageName(over.id)}.`
        : undefined,
    onDragEnd: ({ active: a, over }) =>
      over
        ? `${describe(byId.get(String(a.id)))} moved to ${stageName(over.id)}.`
        : `${describe(byId.get(String(a.id)))} put back.`,
    onDragCancel: ({ active: a }) =>
      `Cancelled. ${describe(byId.get(String(a.id)))} is back where it was.`,
  };

  const start = ({ active: a }: DragStartEvent) => {
    dragging.current = true;
    setActive(String(a.id));
  };

  const over = ({ active: a, over: target }: DragOverEvent) => {
    if (!target) return;
    const id = String(a.id);
    const from = columnOf(columns, id);
    const to = columnOf(columns, String(target.id));
    if (!from || !to || from === to) return;
    const overIndex = String(target.id).startsWith("column:")
      ? columns[to].length
      : columns[to].indexOf(String(target.id));
    setColumns(moveCard(columns, id, to, overIndex));
  };

  const end = ({ active: a, over: target }: DragEndEvent) => {
    const id = String(a.id);
    dragging.current = false;
    setActive(null);
    lastDrop.current = Date.now();
    const original = byId.get(id);
    const stage = columnOf(columns, id);
    if (!target || !original || !stage) {
      setColumns(toColumns(items));
      return;
    }
    let next = columns;
    const overId = String(target.id);
    if (!overId.startsWith("column:") && columns[stage].includes(overId)) {
      next = {
        ...columns,
        [stage]: arrayMove(
          columns[stage],
          columns[stage].indexOf(id),
          columns[stage].indexOf(overId),
        ),
      };
      setColumns(next);
    }
    const index = next[stage].indexOf(id);
    const positions = new Map(items.map((item) => [item.id, item.position]));
    const before = toColumns(items)[original.stage].indexOf(id);
    if (stage === original.stage && index === before) return;
    onMove(id, stage, positionAt(next[stage], index, positions));
  };

  const open = (id: string) => {
    if (Date.now() - lastDrop.current < 250) return; // the click that ends a drag
    onOpen(id);
  };
  const dragged = active ? byId.get(active) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={start}
      onDragOver={over}
      onDragEnd={end}
      onDragCancel={() => {
        dragging.current = false;
        setActive(null);
        setColumns(toColumns(items));
      }}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Press Enter to open this application. Press Space to pick it up, the arrow keys to move it between stages, and Space again to drop it.",
        },
      }}
    >
      <div className="-mx-5 overflow-x-auto px-5 pb-3 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <div className="flex gap-3">
          {PATH.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              ids={columns[stage]}
              byId={byId}
              onOpen={open}
            />
          ))}
        </div>
      </div>
      <ClosedZone
        ids={columns.rejected}
        byId={byId}
        onOpen={open}
        dragging={Boolean(active)}
      />
      <DragOverlay dropAnimation={{ duration: 180 }}>
        {dragged ? (
          <div
            className={cn(
              cardClass,
              "cursor-grabbing border-line-strong shadow-sheet motion-safe:rotate-[1.2deg]",
            )}
          >
            <AppCardBody app={dragged} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
