import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, PlusCircle, Save, Send, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import LoadingState from '@/components/common/LoadingState';
import PageHeader from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import SignDialog from '@/features/_shared/eri/SignDialog';
import { useActingEmployee } from '@/lib/acting';
import { listEmployees } from '@/lib/data/employees';
import { listUnits } from '@/lib/data/units';
import {
  generateTabel,
  getTabel,
  headDecideTabel,
  hrDecideTabel,
  listTabels,
  submitTabel,
  updateTabelEntries,
  TabelNetworkError,
  TabelValidationError,
} from '@/lib/data/tabels';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Employee, Tabel, TabelEntryStatus, Unit } from '@/types/domain';

import { DAY_STATUS_OPTIONS, statusMeta } from './statusMeta';
import TabelRejectDialog from './TabelRejectDialog';

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

function daysInPeriod(period: string): number {
  const [y, m] = period.split('-').map(Number);
  return new Date(y!, m!, 0).getDate();
}

const EDITABLE_STATUSES: Tabel['status'][] = ['DRAFT', 'HEAD_REJECTED', 'HR_REJECTED'];

export default function TabelsPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const roles = useAuthStore((s) => s.user?.roles) ?? [];
  const isHr = roles.some((r) => r === 'ROLE_SUPER_ADMIN' || r === 'ROLE_HR_ADMIN');
  const acting = useActingEmployee();

  const [allUnits, setAllUnits] = useState<Unit[] | null>(null);
  const [unitUuid, setUnitUuid] = useState('');
  const [period, setPeriod] = useState(currentPeriod());

  const [tabel, setTabel] = useState<Tabel | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [entries, setEntries] = useState<Map<string, { status: TabelEntryStatus; note?: string }>>(
    new Map(),
  );
  const [busy, setBusy] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState<'head' | 'hr' | null>(null);

  const isHeadOfUnit = !!unitUuid && (acting?.headedUnitUuids.includes(unitUuid) ?? false);

  const availableUnits = useMemo(() => {
    if (!allUnits) return [];
    if (isHr) return allUnits.filter((u) => u.status === 'ACTIVE');
    const headed = acting?.headedUnitUuids ?? [];
    return allUnits.filter((u) => headed.includes(u.uuid));
  }, [allUnits, isHr, acting]);

  useEffect(() => {
    void (async () => {
      try {
        setAllUnits(await listUnits());
      } catch {
        setAllUnits([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!unitUuid && availableUnits.length > 0) setUnitUuid(availableUnits[0]!.uuid); // eslint-disable-line react-hooks/set-state-in-effect
  }, [availableUnits, unitUuid]);

  const key = (employeeUuid: string, workDate: string) => `${employeeUuid}|${workDate}`;

  const reload = useCallback(async () => {
    if (!unitUuid || !period) return;
    setTabel(null);
    setNotFound(false);
    try {
      const rows = await listTabels({ unitUuid, period });
      const found = rows[0];
      if (!found) {
        setNotFound(true);
        return;
      }
      const full = await getTabel(found.uuid);
      setTabel(full);
      const map = new Map<string, { status: TabelEntryStatus; note?: string }>();
      for (const e of full.entries ?? []) map.set(key(e.employeeUuid, e.workDate), { status: e.status, note: e.note });
      setEntries(map);
      const emps = await listEmployees({ unitUuid });
      setEmployees(emps);
    } catch (err) {
      if (err instanceof TabelNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    }
  }, [unitUuid, period, t]);

  useEffect(() => {
    void reload(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [reload]);

  async function handleGenerate() {
    setBusy(true);
    try {
      await generateTabel(unitUuid, period);
      toast.success(t('dashboard:tabels.toast.generated'));
      await reload();
    } catch (err) {
      if (err instanceof TabelValidationError) toast.error(t(`dashboard:tabels.errors.${err.code}`));
      else if (err instanceof TabelNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!tabel) return;
    setBusy(true);
    try {
      const payload = Array.from(entries.entries()).map(([k, v]) => {
        const [employeeUuid, workDate] = k.split('|') as [string, string];
        return { employeeUuid, workDate, status: v.status, note: v.note };
      });
      await updateTabelEntries(tabel.uuid, payload);
      toast.success(t('dashboard:tabels.toast.saved'));
      await reload();
    } catch (err) {
      if (err instanceof TabelValidationError) toast.error(t(`dashboard:tabels.errors.${err.code}`));
      else if (err instanceof TabelNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (!tabel) return;
    setBusy(true);
    try {
      await submitTabel(tabel.uuid);
      toast.success(t('dashboard:tabels.toast.submitted'));
      await reload();
    } catch (err) {
      if (err instanceof TabelValidationError) toast.error(t(`dashboard:tabels.errors.${err.code}`));
      else if (err instanceof TabelNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    } finally {
      setBusy(false);
    }
  }

  async function handleHrAccept() {
    if (!tabel) return;
    setBusy(true);
    try {
      await hrDecideTabel(tabel.uuid, { approve: true });
      toast.success(t('dashboard:tabels.toast.hr-accepted'));
      await reload();
    } catch (err) {
      if (err instanceof TabelValidationError) toast.error(t(`dashboard:tabels.errors.${err.code}`));
      else if (err instanceof TabelNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    } finally {
      setBusy(false);
    }
  }

  const editable = !!tabel && EDITABLE_STATUSES.includes(tabel.status);
  const canSubmit = editable;
  const canHeadDecide = !!tabel && tabel.status === 'SENT_TO_HEAD' && isHeadOfUnit;
  const canHrDecide = !!tabel && tabel.status === 'SENT_TO_HR' && isHr;

  const days = Array.from({ length: daysInPeriod(period) }, (_, i) => i + 1);
  const unitName = availableUnits.find((u) => u.uuid === unitUuid)?.nameUz ?? '';

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader title={t('dashboard:tabels.page-title')} subtitle={t('dashboard:tabels.page-subtitle')} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('dashboard:tabels.filters.unit')}
          </label>
          <Select value={unitUuid} onValueChange={setUnitUuid}>
            <SelectTrigger>
              <SelectValue placeholder={t('common:labels.select')} />
            </SelectTrigger>
            <SelectContent>
              {availableUnits.map((u) => (
                <SelectItem key={u.uuid} value={u.uuid}>
                  {u.nameUz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('dashboard:tabels.filters.period')}
          </label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          />
        </div>
      </div>

      {availableUnits.length === 0 && allUnits !== null && (
        <p className="text-sm text-muted-foreground">{t('dashboard:tabels.no-units')}</p>
      )}

      {unitUuid && notFound && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('dashboard:tabels.empty')}</p>
          <Button disabled={busy} onClick={() => void handleGenerate()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('dashboard:tabels.generate')}
          </Button>
        </div>
      )}

      {unitUuid && !notFound && !tabel && <LoadingState rows={4} />}

      {tabel && employees && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{t(`dashboard:tabels.status.${tabel.status}`)}</Badge>
            {tabel.headNote && (
              <span className="text-xs text-muted-foreground">
                {t('dashboard:tabels.head-note')}: {tabel.headNote}
              </span>
            )}
            {tabel.hrNote && (
              <span className="text-xs text-muted-foreground">
                {t('dashboard:tabels.hr-note')}: {tabel.hrNote}
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-line">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 min-w-48 bg-surface">
                    {t('dashboard:tabels.col-employee')}
                  </TableHead>
                  {days.map((d) => (
                    <TableHead key={d} className="min-w-24 text-center">
                      {d}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.uuid}>
                    <TableCell className="sticky left-0 z-10 bg-surface font-medium">
                      {emp.fullNameGenerated}
                    </TableCell>
                    {days.map((d) => {
                      const workDate = `${period}-${String(d).padStart(2, '0')}`;
                      const cell = entries.get(key(emp.uuid, workDate));
                      if (!cell) {
                        return (
                          <TableCell key={d} className="text-center text-muted-foreground">
                            —
                          </TableCell>
                        );
                      }
                      if (!editable) {
                        const meta = statusMeta(cell.status);
                        return (
                          <TableCell key={d} className="text-center">
                            <Badge variant={meta.badgeVariant}>{t(meta.labelKey)}</Badge>
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={d} className="p-1 text-center">
                          <Select
                            value={cell.status}
                            onValueChange={(v) =>
                              setEntries((prev) => {
                                const next = new Map(prev);
                                next.set(key(emp.uuid, workDate), {
                                  ...cell,
                                  status: v as TabelEntryStatus,
                                });
                                return next;
                              })
                            }
                          >
                            <SelectTrigger className="h-8 w-full text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAY_STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {t(statusMeta(s).labelKey)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap gap-2">
            {editable && (
              <Button variant="outline" disabled={busy} onClick={() => void handleSave()}>
                <Save className="mr-2 h-4 w-4" />
                {t('common:actions.save')}
              </Button>
            )}
            {canSubmit && (
              <Button disabled={busy} onClick={() => void handleSubmit()}>
                <Send className="mr-2 h-4 w-4" />
                {t('dashboard:tabels.submit')}
              </Button>
            )}
            {canHeadDecide && (
              <>
                <Button disabled={busy} onClick={() => setSignOpen(true)}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {t('dashboard:tabels.head-approve')}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setRejectOpen('head')}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {t('common:actions.reject')}
                </Button>
              </>
            )}
            {canHrDecide && (
              <>
                <Button disabled={busy} onClick={() => void handleHrAccept()}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('dashboard:tabels.hr-accept')}
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => setRejectOpen('hr')}>
                  <XCircle className="mr-2 h-4 w-4" />
                  {t('common:actions.reject')}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {tabel && acting && (
        <SignDialog
          open={signOpen}
          onOpenChange={setSignOpen}
          resourceUuid={tabel.uuid}
          actorUuid={acting.employee.uuid}
          onDone={() => void reload()}
          onSign={(certificateUuid, signatureHex) =>
            headDecideTabel(tabel.uuid, { approve: true, certificateUuid, signatureHex })
          }
          successKey="dashboard:tabels.sign.success"
          resolveErrorKey={(err) => {
            if (err instanceof TabelValidationError) return `dashboard:tabels.errors.${err.code}`;
            if (err instanceof TabelNetworkError) return 'common:errors.network';
            return undefined;
          }}
        />
      )}

      {tabel && (
        <TabelRejectDialog
          open={rejectOpen !== null}
          onOpenChange={(open) => {
            if (!open) setRejectOpen(null);
          }}
          title={
            rejectOpen === 'head'
              ? t('dashboard:tabels.reject.head-title', { unit: unitName })
              : t('dashboard:tabels.reject.hr-title', { unit: unitName })
          }
          onReject={(note) =>
            rejectOpen === 'head'
              ? headDecideTabel(tabel.uuid, { approve: false, note })
              : hrDecideTabel(tabel.uuid, { approve: false, note })
          }
          onDone={() => void reload()}
        />
      )}
    </div>
  );
}
