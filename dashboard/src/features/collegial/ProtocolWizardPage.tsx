import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import Combobox, { type ComboboxOption } from '@/components/common/Combobox';
import LoadingState from '@/components/common/LoadingState';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { useActingEmployee } from '@/lib/acting';
import { listCollegialBodies } from '@/lib/data/collegialBodies';
import { listEmployees } from '@/lib/data/employees';
import {
  createProtocol,
  CollegialNetworkError,
  CollegialValidationError,
} from '@/lib/data/protocols';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CollegialBody, Employee } from '@/types/domain';

const TEMPLATE_KEYS = ['STANDARD', 'BUDGET_DECISION'];

export default function ProtocolWizardPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const acting = useActingEmployee();
  const roles = useAuthStore((s) => s.user?.roles) ?? [];
  const isAdmin = roles.some((r) => r === 'ROLE_SUPER_ADMIN' || r === 'ROLE_HR_ADMIN');

  const [bodies, setBodies] = useState<CollegialBody[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bodyUuid, setBodyUuid] = useState('');
  const [participantUuids, setParticipantUuids] = useState<string[]>([]);
  const [reviewerUuids, setReviewerUuids] = useState<string[]>([]);
  const [protocolDate, setProtocolDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [templateKey, setTemplateKey] = useState('STANDARD');
  const [agenda, setAgenda] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [b, e] = await Promise.all([listCollegialBodies(), listEmployees()]);
        setBodies(b);
        setEmployees(e);
      } catch {
        setBodies([]);
      }
    })();
  }, []);

  const eligibleBodies = useMemo(() => {
    if (!bodies || !acting) return [];
    if (isAdmin) return bodies.filter((b) => b.status === 'ACTIVE');
    return bodies.filter((b) => b.status === 'ACTIVE' && b.secretaryEmployeeUuid === acting.employee.uuid);
  }, [bodies, acting, isAdmin]);

  useEffect(() => {
    if (!bodyUuid && eligibleBodies.length > 0) setBodyUuid(eligibleBodies[0]!.uuid); // eslint-disable-line react-hooks/set-state-in-effect
  }, [eligibleBodies, bodyUuid]);

  const body = bodies?.find((b) => b.uuid === bodyUuid) ?? null;
  const byUuid = useMemo(() => new Map(employees.map((e) => [e.uuid, e])), [employees]);

  const rosterUuids = body?.memberEmployeeUuids ?? [];

  useEffect(() => {
    setParticipantUuids([]); // eslint-disable-line react-hooks/set-state-in-effect
    setReviewerUuids([]);
  }, [bodyUuid]);

  function toggleParticipant(uuid: string, checked: boolean) {
    setParticipantUuids((prev) => (checked ? [...prev, uuid] : prev.filter((u) => u !== uuid)));
  }

  const reviewerOptions: ComboboxOption[] = useMemo(() => {
    const taken = new Set(reviewerUuids);
    return employees
      .filter((e) => e.status !== 'TERMINATED' && !taken.has(e.uuid))
      .map((e) => ({ value: e.uuid, label: e.fullNameGenerated, sublabel: e.corporateEmail }));
  }, [employees, reviewerUuids]);

  const quorumMet = body ? participantUuids.length >= body.quorumMin : false;
  const canSubmit = !!bodyUuid && !!agenda.trim() && !!protocolDate && quorumMet && !submitting;

  async function onSubmit() {
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const protocol = await createProtocol(bodyUuid, {
        protocolDate,
        templateKey,
        agenda: agenda.trim(),
        participantUuids,
        reviewerUuids,
      });
      toast.success(t('dashboard:collegial.protocols.wizard.toast.created'));
      navigate(`/protocols/${protocol.uuid}`);
    } catch (err) {
      if (err instanceof CollegialValidationError) toast.error(t(`dashboard:collegial.errors.${err.code}`));
      else if (err instanceof CollegialNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!acting) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <LoadingState rows={4} />
      </div>
    );
  }

  if (bodies && eligibleBodies.length === 0) {
    return <Navigate to="/protocols" replace />;
  }

  const onClose = () => navigate('/protocols');

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 md:hidden">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('common:actions.close')}>
          <X className="h-5 w-5" />
        </Button>
        <h1 className="truncate text-base font-semibold text-ink">
          {t('dashboard:collegial.protocols.wizard.title')}
        </h1>
      </header>

      <header className="hidden items-center justify-between border-b border-line bg-surface px-6 py-4 md:flex">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1">
            <Link to="/protocols">
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t('common:actions.back')}
            </Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {t('dashboard:collegial.protocols.wizard.title')}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('dashboard:collegial.protocols.wizard.description')}
          </p>
        </div>
        <Button variant="ghost" onClick={onClose}>
          {t('common:actions.cancel')}
        </Button>
      </header>

      <div className="flex flex-1 flex-col md:items-center md:py-8">
        <div className="flex w-full flex-1 flex-col md:max-w-3xl md:rounded-xl md:border md:border-line md:bg-surface md:shadow-sm">
          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6 md:px-8">
            {!bodies ? (
              <LoadingState rows={4} />
            ) : (
              <>
                <div className="space-y-2">
                  <Label>
                    {t('dashboard:collegial.protocols.wizard.field-body')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select value={bodyUuid} onValueChange={setBodyUuid}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleBodies.map((b) => (
                        <SelectItem key={b.uuid} value={b.uuid}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {body && (
                  <div className="space-y-2">
                    <Label>
                      {t('dashboard:collegial.protocols.wizard.field-participants')}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Alert variant={quorumMet ? 'default' : 'destructive'}>
                      <AlertDescription>
                        {t('dashboard:collegial.protocols.wizard.quorum-hint', {
                          selected: participantUuids.length,
                          min: body.quorumMin,
                        })}
                      </AlertDescription>
                    </Alert>
                    {rosterUuids.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t('dashboard:collegial.protocols.wizard.no-roster')}
                      </p>
                    ) : (
                      <ul className="space-y-1.5 rounded-lg border border-line p-2">
                        {rosterUuids.map((uuid) => (
                          <li key={uuid} className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
                            <Checkbox
                              id={`p-${uuid}`}
                              checked={participantUuids.includes(uuid)}
                              onCheckedChange={(c) => toggleParticipant(uuid, c === true)}
                            />
                            <label htmlFor={`p-${uuid}`} className="cursor-pointer text-sm text-ink">
                              {byUuid.get(uuid)?.fullNameGenerated ?? uuid}
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                    {touched && !quorumMet && (
                      <p className="text-xs text-destructive">
                        {t('dashboard:collegial.errors.quorum-not-met')}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{t('dashboard:collegial.protocols.wizard.field-reviewers')}</Label>
                  {reviewerUuids.length > 0 && (
                    <ul className="space-y-1.5">
                      {reviewerUuids.map((uuid) => (
                        <li
                          key={uuid}
                          className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm"
                        >
                          <span className="truncate text-ink">{byUuid.get(uuid)?.fullNameGenerated ?? uuid}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setReviewerUuids((prev) => prev.filter((u) => u !== uuid))}
                            aria-label={t('common:actions.remove')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Combobox
                    options={reviewerOptions}
                    value={null}
                    onChange={(v) => setReviewerUuids((prev) => [...prev, v])}
                    placeholder={t('dashboard:collegial.protocols.wizard.add-reviewer')}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="protocol-date">
                      {t('dashboard:collegial.protocols.wizard.field-date')}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="protocol-date"
                      type="date"
                      value={protocolDate}
                      onChange={(e) => setProtocolDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('dashboard:collegial.protocols.wizard.field-template')}</Label>
                    <Select value={templateKey} onValueChange={setTemplateKey}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_KEYS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {t(`dashboard:collegial.protocols.template.${k}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="protocol-agenda">
                    {t('dashboard:collegial.protocols.wizard.field-agenda')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="protocol-agenda"
                    rows={6}
                    value={agenda}
                    onChange={(e) => setAgenda(e.target.value)}
                    placeholder={t('dashboard:collegial.protocols.wizard.agenda-placeholder')}
                  />
                </div>
              </>
            )}
          </div>

          <footer className="pb-safe sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 pt-4 md:px-8">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="button" onClick={() => void onSubmit()} disabled={!canSubmit}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('dashboard:collegial.protocols.wizard.submit')}
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );
}
