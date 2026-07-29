import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { listEmployees } from '@/lib/data/employees';
import { startTask } from '@/lib/data/tasks';
import { cn } from '@/lib/utils';
import type { Employee, TaskEntity, TaskStatus } from '@/types/domain';

import type { ReviewDecision } from './detail/ReviewDialog';
import TaskCard from './TaskCard';
import { toastTaskError } from './taskErrors';

/**
 * A board drop that can't be performed directly (needs a deliverable or a
 * review decision) is surfaced UP to the page, which hosts the matching dialog.
 * The card does NOT move on drop — it commits only after the dialog succeeds
 * and the page refetches. `submit` → SubmitDeliverableDialog; `review` →
 * ReviewDialog seeded with `decision`.
 */
export type TaskTransitionRequest = {
  task: TaskEntity;
  kind: 'submit' | 'review';
  decision?: ReviewDecision;
};

// Four board columns. REJECTED tasks render inside the DONE column.
const COLUMNS: Array<{
  key: TaskStatus;
  headerBg: string;
  headerText: string;
  labelKey: string;
}> = [
  {
    key: 'NEW',
    headerBg: 'bg-surface-2',
    headerText: 'text-ink-soft',
    labelKey: 'dashboard:tasks.board.col-new',
  },
  {
    key: 'IN_PROGRESS',
    headerBg: 'bg-warning-soft',
    headerText: 'text-warning',
    labelKey: 'dashboard:tasks.board.col-in-progress',
  },
  {
    key: 'UNDER_REVIEW',
    headerBg: 'bg-warning-soft',
    headerText: 'text-warning',
    labelKey: 'dashboard:tasks.board.col-under-review',
  },
  {
    key: 'DONE',
    headerBg: 'bg-brand-soft',
    headerText: 'text-primary-deep',
    labelKey: 'dashboard:tasks.board.col-done',
  },
];

interface Props {
  tasks: TaskEntity[];
  box: 'assigned-by-me' | 'assigned-to-me';
  actingUuid: string;
  onChanged: () => void;
  /** A dialog-needing drop (submit / review) is hosted by the page. */
  onTransitionDialog: (req: TaskTransitionRequest) => void;
}

export default function TasksKanban({
  tasks,
  box,
  actingUuid,
  onChanged,
  onTransitionDialog,
}: Props) {
  const { t } = useTranslation(['dashboard']);

  // Optimistic-move overlay: when a NEW→IN_PROGRESS drag fires startTask, we
  // immediately reflect the new status locally and roll back if the mutation
  // throws. `null` means "render the parent's tasks as-is" (steady state).
  const [optimistic, setOptimistic] = useState<TaskEntity[] | null>(null);

  // The board renders the optimistic snapshot while a direct move is in flight,
  // otherwise the parent-provided tasks. Once the parent refetches via
  // onChanged(), the fresh list flows in through props and the snapshot clears.
  const view = optimistic ?? tasks;

  // Load employees once to resolve counterpart names.
  const [employees, setEmployees] = useState<Employee[]>([]);
  useEffect(() => {
    let alive = true;
    listEmployees().then((list) => {
      if (alive) setEmployees(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const empByUuid = useMemo(
    () => new Map(employees.map((e) => [e.uuid, e])),
    [employees],
  );

  // When the parent hands us a new tasks array (e.g. after onChanged() refetch),
  // drop any stale optimistic snapshot — the props are now the source of truth.
  useEffect(() => {
    setOptimistic(null); // eslint-disable-line react-hooks/set-state-in-effect
  }, [tasks]);

  // Group tasks by column key. REJECTED tasks go into the DONE column bucket.
  const rowsByColumn = useMemo(() => {
    const grouped: Record<TaskStatus, TaskEntity[]> = {
      NEW: [],
      IN_PROGRESS: [],
      UNDER_REVIEW: [],
      DONE: [],
      REJECTED: [], // filled but not used as a column key
    };
    for (const task of view) {
      if (task.status === 'REJECTED') {
        grouped['DONE'].push(task);
      } else {
        grouped[task.status].push(task);
      }
    }
    return grouped;
  }, [view]);

  // 8 px activation keeps tap-to-navigate intact; keyboard sensor for a11y.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [dragging, setDragging] = useState<TaskEntity | null>(null);
  const justDragged = useRef(false);

  function onDragStart(e: DragStartEvent) {
    const task = view.find((t) => t.uuid === e.active.id);
    if (task) setDragging(task);
  }

  function onDragEnd(e: DragEndEvent) {
    // After a real drag the browser fires a synthesized click on the released
    // card; SortableTaskCard's onClickCapture consults this ref and suppresses
    // it so the detail page doesn't open on top of the drop result.
    justDragged.current = true;
    setTimeout(() => {
      justDragged.current = false;
    }, 0);
    setDragging(null);

    if (!e.over) return;

    const activeId = String(e.active.id);
    const task = view.find((tk) => tk.uuid === activeId);
    if (!task) return;

    // Destination column status: dropping on a card uses that card's column
    // (REJECTED maps to DONE); dropping on empty space uses the column id.
    const overData = e.over.data.current as
      | { type?: 'card' | 'column'; fromStatus?: TaskStatus; status?: TaskStatus }
      | undefined;
    const rawTo =
      overData?.type === 'card' ? overData.fromStatus : overData?.status;
    if (!rawTo) return;
    const toColumn: TaskStatus = rawTo === 'REJECTED' ? 'DONE' : rawTo;

    // Column the dragged card currently lives in (REJECTED renders in DONE).
    const fromColumn: TaskStatus = task.status === 'REJECTED' ? 'DONE' : task.status;

    // No real cross-column change → snap back, no-op (covers within-column
    // reorder and releasing on the same column's empty space).
    if (fromColumn === toColumn) return;

    const from = task.status;

    // NEW → IN_PROGRESS — assignee only. Direct startTask with optimistic move
    // + rollback (cloned from CertificatesKanban's onDrop idiom).
    if (from === 'NEW' && toColumn === 'IN_PROGRESS' && box === 'assigned-to-me') {
      const snapshot = view;
      setOptimistic(
        view.map((tk) =>
          tk.uuid === task.uuid ? { ...tk, status: 'IN_PROGRESS' } : tk,
        ),
      );
      void (async () => {
        try {
          await startTask(task.uuid, actingUuid);
          onChanged();
        } catch (err) {
          setOptimistic(snapshot);
          toastTaskError(t, err);
        }
      })();
      return;
    }

    // IN_PROGRESS → UNDER_REVIEW — needs a deliverable. Open the submit dialog;
    // the card moves only after it succeeds (via the page's refetch).
    if (from === 'IN_PROGRESS' && toColumn === 'UNDER_REVIEW' && box === 'assigned-to-me') {
      onTransitionDialog({ task, kind: 'submit' });
      return;
    }

    // UNDER_REVIEW → DONE — assigner accepts. Open ReviewDialog at ACCEPT.
    if (from === 'UNDER_REVIEW' && toColumn === 'DONE' && box === 'assigned-by-me') {
      onTransitionDialog({ task, kind: 'review', decision: 'ACCEPT' });
      return;
    }

    // UNDER_REVIEW → IN_PROGRESS — assigner returns for rework. Open ReviewDialog
    // at RETURN.
    if (from === 'UNDER_REVIEW' && toColumn === 'IN_PROGRESS' && box === 'assigned-by-me') {
      onTransitionDialog({ task, kind: 'review', decision: 'RETURN' });
      return;
    }

    // Anything else (terminal cards, wrong persona, illegal cross-column hop)
    // snaps back with no mutation and a localized invalid-move toast.
    toast.error(t('dashboard:tasks.errors.invalid-move'));
  }

  function resolveCounterpartName(task: TaskEntity): string | undefined {
    const uuid =
      box === 'assigned-by-me' ? task.assigneeUuid : task.assignerUuid;
    return empByUuid.get(uuid)?.fullNameGenerated;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => (
          <DroppableColumn
            key={col.key}
            status={col.key}
            headerBg={col.headerBg}
            headerText={col.headerText}
            label={t(col.labelKey)}
            rows={rowsByColumn[col.key] ?? []}
            emptyLabel={t('dashboard:tasks.empty')}
            box={box}
            empByUuid={empByUuid}
            justDraggedRef={justDragged}
            resolveCounterpartName={resolveCounterpartName}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging ? (
          <div className="w-72 cursor-grabbing opacity-90 shadow-lg">
            <TaskCard
              task={dragging}
              box={box}
              counterpartName={resolveCounterpartName(dragging)}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface DroppableColumnProps {
  status: TaskStatus;
  headerBg: string;
  headerText: string;
  label: string;
  emptyLabel: string;
  rows: TaskEntity[];
  box: 'assigned-by-me' | 'assigned-to-me';
  empByUuid: Map<string, Employee>;
  justDraggedRef: React.MutableRefObject<boolean>;
  resolveCounterpartName: (task: TaskEntity) => string | undefined;
}

function DroppableColumn({
  status,
  headerBg,
  headerText,
  label,
  emptyLabel,
  rows,
  box,
  justDraggedRef,
  resolveCounterpartName,
}: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({ id: status, data: { type: 'column', status } });

  const list = (
    <div className="flex-1 space-y-2 overflow-y-auto pr-1">
      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        rows.map((task) => (
          <SortableTaskCard
            key={task.uuid}
            task={task}
            box={box}
            counterpartName={resolveCounterpartName(task)}
            justDraggedRef={justDraggedRef}
          />
        ))
      )}
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      className="flex min-h-120 flex-col rounded-xl border border-line bg-surface-2/40 p-3 transition-shadow"
    >
      <div className={`mb-3 flex items-center justify-between rounded-md px-3 py-2 ${headerBg}`}>
        <span className={`text-xs font-semibold uppercase tracking-wider ${headerText}`}>
          {label}
        </span>
        <Badge variant="outline" className="border-line bg-canvas tabular-nums">
          {rows.length}
        </Badge>
      </div>
      <SortableContext
        id={status}
        items={rows.map((t) => t.uuid)}
        strategy={verticalListSortingStrategy}
      >
        {list}
      </SortableContext>
    </div>
  );
}

interface SortableTaskCardProps {
  task: TaskEntity;
  box: 'assigned-by-me' | 'assigned-to-me';
  counterpartName?: string;
  justDraggedRef: React.MutableRefObject<boolean>;
}

function SortableTaskCard({ task, box, counterpartName, justDraggedRef }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.uuid,
    data: { type: 'card', fromStatus: task.status },
  });

  function handleClickCapture(e: React.MouseEvent) {
    if (justDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  }

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClickCapture={handleClickCapture}
      className={cn(
        'select-none cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-30',
      )}
    >
      <TaskCard task={task} box={box} counterpartName={counterpartName} />
    </div>
  );
}
