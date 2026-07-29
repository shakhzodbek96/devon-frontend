import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Plus } from 'lucide-react';

import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import LoadingState from '@/components/common/LoadingState';
import PageHeader from '@/components/common/PageHeader';
import TabLabel from '@/components/common/TabLabel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActingEmployee } from '@/lib/acting';
import { listTasks } from '@/lib/data/tasks';
import { useMediaQuery } from '@/lib/use-media-query';
import type { TaskEntity } from '@/types/domain';

import ReviewDialog from './detail/ReviewDialog';
import SubmitDeliverableDialog from './detail/SubmitDeliverableDialog';
import TaskFilters, {
  defaultTaskFilters,
  type TaskFiltersState,
} from './TaskFilters';
import TaskStatsBand from './TaskStatsBand';
import TasksKanban, { type TaskTransitionRequest } from './TasksKanban';
import TasksTabsMobile from './TasksTabsMobile';

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskBox = 'assigned-by-me' | 'assigned-to-me';

// ─── Tab trigger className — mirrors LettersPage ──────────────────────────────

const TAB_TRIGGER_CN =
  'h-auto flex-none rounded-none px-3 py-2.5 text-sm ' +
  'data-active:text-primary data-active:font-semibold ' +
  'group-data-horizontal/tabs:after:-bottom-px ' +
  'group-data-horizontal/tabs:after:h-0.5 ' +
  'group-data-horizontal/tabs:after:bg-primary';

// ─── BoardSection — lifted outside the page component ─────────────────────────

interface BoardSectionProps {
  tasks: TaskEntity[] | null;
  error: boolean;
  isDesktop: boolean;
  currentBox: TaskBox;
  actingUuid: string;
  onRetry: () => void;
  onChanged: () => void;
  onTransitionDialog: (req: TaskTransitionRequest) => void;
}

function BoardSection({
  tasks,
  error,
  isDesktop,
  currentBox,
  actingUuid,
  onRetry,
  onChanged,
  onTransitionDialog,
}: BoardSectionProps) {
  const { t } = useTranslation(['dashboard']);
  return (
    <>
      {error && <ErrorState onRetry={onRetry} />}
      {!error && !tasks && <LoadingState rows={6} />}
      {!error && tasks && tasks.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title={t('dashboard:tasks.empty-page')}
        />
      )}
      {!error && tasks && tasks.length > 0 && (
        isDesktop ? (
          <TasksKanban
            tasks={tasks}
            box={currentBox}
            actingUuid={actingUuid}
            onChanged={onChanged}
            onTransitionDialog={onTransitionDialog}
          />
        ) : (
          <TasksTabsMobile
            tasks={tasks}
            box={currentBox}
            actingUuid={actingUuid}
            onChanged={onChanged}
          />
        )
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const acting = useActingEmployee();
  const navigate = useNavigate();

  const isManager = (acting?.headedUnitUuids.length ?? 0) > 0;

  // Default box: managers start on "assigned-by-me", workers on "assigned-to-me".
  // Initialised once when acting resolves to avoid flicking box on every render.
  const [box, setBox] = useState<TaskBox>('assigned-to-me');
  const [boxInitialised, setBoxInitialised] = useState(false);
  useEffect(() => {
    if (!acting || boxInitialised) return;
    setBox(acting.headedUnitUuids.length > 0 ? 'assigned-by-me' : 'assigned-to-me'); // eslint-disable-line react-hooks/set-state-in-effect
    setBoxInitialised(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, [acting, boxInitialised]);

  const [filters, setFilters] = useState<TaskFiltersState>(defaultTaskFilters);
  const [tasks, setTasks] = useState<TaskEntity[] | null>(null);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [version, setVersion] = useState(0);

  // Board drops that need a dialog (submit deliverable / review decision) lift
  // their request here; the page hosts the matching dialog. Null = closed.
  const [transition, setTransition] = useState<TaskTransitionRequest | null>(null);

  // Fetch tasks whenever acting persona, box, filters, or version changes.
  useEffect(() => {
    if (!acting) return;
    let cancelled = false;
    setTasks(null); // eslint-disable-line react-hooks/set-state-in-effect
    setError(false); // eslint-disable-line react-hooks/set-state-in-effect
    void (async () => {
      try {
        const rows = await listTasks(
          {
            box,
            priority: filters.priority === 'ALL' ? undefined : filters.priority,
            overdueOnly: filters.overdueOnly || undefined,
            search: filters.search || undefined,
          },
          acting.employee.uuid,
        );
        if (!cancelled) setTasks(rows);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acting?.employee.uuid, box, filters.priority, filters.overdueOnly, filters.search, retryKey, version]);

  function bumpVersion() {
    setVersion((v) => v + 1);
  }

  // While acting hasn't resolved yet — show skeleton
  if (!acting) {
    return <LoadingState rows={6} />;
  }

  const actingUuid = acting.employee.uuid;

  const boardProps: Omit<BoardSectionProps, 'currentBox'> = {
    tasks,
    error,
    isDesktop,
    actingUuid,
    onRetry: () => setRetryKey((k) => k + 1),
    onChanged: bumpVersion,
    onTransitionDialog: setTransition,
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title={t('dashboard:tasks.title')}
        actions={
          isManager ? (
            <Button onClick={() => navigate('/tasks/new')} className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard:tasks.cta-create')}
            </Button>
          ) : undefined
        }
      />

      {isManager ? (
        /* Manager view: box toggle tabs */
        <Tabs
          value={box}
          onValueChange={(v) => {
            setBox(v as TaskBox);
            setFilters(defaultTaskFilters);
          }}
          className="w-full"
        >
          <TabsList
            variant="line"
            className="no-scrollbar h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-line p-0 md:gap-2"
          >
            <TabsTrigger value="assigned-by-me" className={TAB_TRIGGER_CN}>
              <TabLabel>{t('dashboard:tasks.box.by-me')}</TabLabel>
            </TabsTrigger>
            <TabsTrigger value="assigned-to-me" className={TAB_TRIGGER_CN}>
              <TabLabel>{t('dashboard:tasks.box.to-me')}</TabLabel>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assigned-by-me">
            <div className="space-y-4 pt-4">
              <TaskStatsBand actingUuid={actingUuid} version={version} />
              <TaskFilters filters={filters} onChange={setFilters} />
              <BoardSection {...boardProps} currentBox="assigned-by-me" />
            </div>
          </TabsContent>

          <TabsContent value="assigned-to-me">
            <div className="space-y-4 pt-4">
              <TaskFilters filters={filters} onChange={setFilters} />
              <BoardSection {...boardProps} currentBox="assigned-to-me" />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        /* Worker-only view: no box toggle, always assigned-to-me */
        <div className="space-y-4">
          <TaskFilters filters={filters} onChange={setFilters} />
          <BoardSection {...boardProps} currentBox="assigned-to-me" />
        </div>
      )}

      {/* Board-drop transition dialogs — hosted at the page so the card moves
          only after a successful mutation refetch. Cancelling either dialog
          leaves the board unchanged (no card was moved on drop). */}
      {transition?.kind === 'submit' && (
        <SubmitDeliverableDialog
          open
          onOpenChange={(o) => {
            if (!o) setTransition(null);
          }}
          task={transition.task}
          acting={acting}
          onDone={() => {
            setTransition(null);
            bumpVersion();
          }}
        />
      )}
      {transition?.kind === 'review' && (
        <ReviewDialog
          open
          onOpenChange={(o) => {
            if (!o) setTransition(null);
          }}
          task={transition.task}
          acting={acting}
          initialDecision={transition.decision}
          onDone={() => {
            setTransition(null);
            bumpVersion();
          }}
        />
      )}
    </div>
  );
}
