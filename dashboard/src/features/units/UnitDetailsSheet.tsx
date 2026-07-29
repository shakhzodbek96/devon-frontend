import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, ChevronRight, Pencil, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import StatusBadge from '@/components/common/StatusBadge';
import { listEmployees } from '@/lib/data/employees';
import type { Unit } from '@/types/domain';

interface Props {
  unit: Unit | null;
  allUnits: Unit[];
  onClose: () => void;
  onEdit: (u: Unit) => void;
  onAddChild: (p: Unit) => void;
  onArchive: (u: Unit) => void;
  onOpenUnit: (u: Unit) => void;
}

export default function UnitDetailsSheet({
  unit,
  allUnits,
  onClose,
  onEdit,
  onAddChild,
  onArchive,
  onOpenUnit,
}: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [empCount, setEmpCount] = useState<number | null>(null);
  const [headName, setHeadName] = useState<string | null>(null);

  const children = useMemo(
    () => (unit ? allUnits.filter((u) => u.parentUuid === unit.uuid) : []),
    [allUnits, unit],
  );

  useEffect(() => {
    if (!unit) {
      setEmpCount(null);
      setHeadName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const emps = await listEmployees({ unitUuid: unit.uuid });
      if (cancelled) return;
      setEmpCount(emps.filter((e) => e.status !== 'TERMINATED').length);
      if (unit.headEmployeeUuid) {
        const head = emps.find((e) => e.uuid === unit.headEmployeeUuid);
        setHeadName(head?.fullNameGenerated ?? null);
      } else {
        setHeadName(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unit]);

  return (
    <Sheet open={!!unit} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        {unit && (
          <>
            <SheetHeader className="border-b border-line p-6">
              <SheetTitle className="pr-10 text-left text-lg">{unit.nameUz}</SheetTitle>
              <SheetDescription className="sr-only">
                {t(`common:unit-types.${unit.type}`)} · {unit.code}
              </SheetDescription>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-line bg-canvas">
                  {t(`common:unit-types.${unit.type}`)}
                </Badge>
                <StatusBadge status={unit.status === 'ACTIVE' ? 'ACTIVE' : 'ARCHIVED'} />
                <span className="text-xs text-muted-foreground">{unit.code}</span>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {t('dashboard:units.details.employees')}
                  </dt>
                  <dd className="font-medium">{empCount ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {t('dashboard:units.details.children')}
                  </dt>
                  <dd className="font-medium">{children.length}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {t('dashboard:units.details.head')}
                  </dt>
                  <dd className="text-right font-medium">
                    {headName ?? (
                      <span className="text-muted-foreground">
                        {t('dashboard:units.details.no-head')}
                      </span>
                    )}
                  </dd>
                </div>
                {unit.description && (
                  <div className="space-y-1 pt-2">
                    <dt className="text-muted-foreground">
                      {t('dashboard:units.form.description-label')}
                    </dt>
                    <dd className="text-ink">{unit.description}</dd>
                  </div>
                )}
              </dl>

              {children.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('dashboard:units.details.children')}
                  </p>
                  <ul className="space-y-1">
                    {children.map((c) => (
                      <li key={c.uuid}>
                        <button
                          type="button"
                          onClick={() => onOpenUnit(c)}
                          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-surface-2"
                        >
                          <span className="text-sm">{c.nameUz}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <SheetFooter className="border-t border-line p-4">
              {/*
                Stacked layout: the drawer caps at `sm:max-w-md` (448 px) and
                the longest Uzbek action label ("Ichki bo'linma qo'shish") plus
                its icon needs ~200 px on its own — three side-by-side buttons
                wrap or collide. One column per row keeps every label on a
                single line and avoids the buttons-overflowing-each-other look.
              */}
              <div className="flex w-full flex-col gap-2">
                <Button
                  onClick={() => onEdit(unit)}
                  variant="default"
                  className="w-full justify-center"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('common:actions.edit')}
                </Button>
                <Button
                  onClick={() => onAddChild(unit)}
                  variant="outline"
                  className="w-full justify-center"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('dashboard:units.tree.add-child')}
                </Button>
                {unit.status === 'ACTIVE' && (
                  <Button
                    onClick={() => onArchive(unit)}
                    variant="ghost"
                    className="w-full justify-center text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    {t('common:actions.archive')}
                  </Button>
                )}
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
