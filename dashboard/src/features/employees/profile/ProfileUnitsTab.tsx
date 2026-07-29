import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

import LoadingState from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import { listAssignments } from '@/lib/data/assignments';
import { listPositions } from '@/lib/data/positions';
import { listUnits } from '@/lib/data/units';
import type { Assignment, Employee, Position, Unit } from '@/types/domain';

import AssignmentTimeline from '../assignments/AssignmentTimeline';

interface Props {
  employee: Employee;
}

export default function ProfileUnitsTab({ employee }: Props) {
  const { t } = useTranslation(['dashboard']);
  const [rows, setRows] = useState<Assignment[] | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [a, u, p] = await Promise.all([
        listAssignments(employee.uuid),
        listUnits(),
        listPositions(),
      ]);
      if (!active) return;
      // Newest first — open assignments (no endDate) sort to top because the
      // sentinel string compares above any real ISO date.
      a.sort((x, y) => (y.endDate ?? '9999').localeCompare(x.endDate ?? '9999'));
      // Stable secondary sort: more recent startDate wins among equally-open rows.
      a.sort((x, y) => y.startDate.localeCompare(x.startDate));
      setRows(a);
      setUnits(u);
      setPositions(p);
    })();
    return () => {
      active = false;
    };
  }, [employee.uuid]);

  if (rows === null) return <LoadingState rows={4} />;

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">
          {t('dashboard:employees.profile.units.heading')}
        </h3>
        <Button asChild variant="outline" size="sm">
          <Link to={`/employees/${employee.uuid}/transfer`}>
            <Plus className="mr-1 h-4 w-4" />
            {t('dashboard:employees.profile.units.add')}
          </Link>
        </Button>
      </div>
      <AssignmentTimeline assignments={rows} units={units} positions={positions} />
    </div>
  );
}
