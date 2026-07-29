import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listEmployees } from '@/lib/data/employees';
import type { Employee, TaskEntity, TaskStatus } from '@/types/domain';

import TaskCard from './TaskCard';

// The four visible tab columns; REJECTED tasks appear in the DONE tab.
const COLUMNS: Array<{ key: TaskStatus; labelKey: string }> = [
  { key: 'NEW', labelKey: 'dashboard:tasks.board.col-new' },
  { key: 'IN_PROGRESS', labelKey: 'dashboard:tasks.board.col-in-progress' },
  { key: 'UNDER_REVIEW', labelKey: 'dashboard:tasks.board.col-under-review' },
  { key: 'DONE', labelKey: 'dashboard:tasks.board.col-done' },
];

// Underline-tab trigger className — same recipe as CertificatesTabsMobile.
const TAB_TRIGGER_CN =
  'h-auto flex-none rounded-none px-3 py-2.5 text-sm ' +
  'data-active:text-primary data-active:font-semibold ' +
  'group-data-horizontal/tabs:after:-bottom-px ' +
  'group-data-horizontal/tabs:after:h-0.5 ' +
  'group-data-horizontal/tabs:after:bg-primary';

interface Props {
  tasks: TaskEntity[];
  box: 'assigned-by-me' | 'assigned-to-me';
  actingUuid: string;
  onChanged: () => void;
}

export default function TasksTabsMobile({ tasks, box, actingUuid, onChanged }: Props) {
  const { t } = useTranslation(['dashboard']);
  const [tab, setTab] = useState<TaskStatus>('NEW');

  // actingUuid and onChanged are intentionally unused until Task 14 wires
  // the transition mutations — reference them to satisfy the linter.
  void actingUuid;
  void onChanged;

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

  // Group: REJECTED tasks go into the DONE bucket.
  const rowsByColumn = useMemo(() => {
    const grouped: Record<TaskStatus, TaskEntity[]> = {
      NEW: [],
      IN_PROGRESS: [],
      UNDER_REVIEW: [],
      DONE: [],
      REJECTED: [],
    };
    for (const task of tasks) {
      if (task.status === 'REJECTED') {
        grouped['DONE'].push(task);
      } else {
        grouped[task.status].push(task);
      }
    }
    return grouped;
  }, [tasks]);

  function countOf(col: TaskStatus): number {
    return rowsByColumn[col].length;
  }

  function resolveCounterpartName(task: TaskEntity): string | undefined {
    const uuid =
      box === 'assigned-by-me' ? task.assigneeUuid : task.assignerUuid;
    return empByUuid.get(uuid)?.fullNameGenerated;
  }

  const rows = rowsByColumn[tab];

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as TaskStatus)}
      className="space-y-3"
    >
      <TabsList
        variant="line"
        className="no-scrollbar h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-line p-0"
      >
        {COLUMNS.map((col) => (
          <TabsTrigger key={col.key} value={col.key} className={TAB_TRIGGER_CN}>
            {t(col.labelKey)}
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-2 px-1.5 text-[10px] font-semibold tabular-nums text-ink">
              {countOf(col.key)}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      {COLUMNS.map((col) => (
        <TabsContent key={col.key} value={col.key} className="space-y-2">
          {col.key === tab && rows.length === 0 && (
            <p className="rounded-lg border border-dashed border-line bg-surface-2/40 py-8 text-center text-sm text-muted-foreground">
              {t('dashboard:tasks.empty')}
            </p>
          )}
          {col.key === tab &&
            rows.map((task) => (
              <TaskCard
                key={task.uuid}
                task={task}
                box={box}
                counterpartName={resolveCounterpartName(task)}
              />
            ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}
