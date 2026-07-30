import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Save, Send, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import LoadingState from '@/components/common/LoadingState';
import PageHeader from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
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

import Combobox, { type ComboboxOption } from '@/components/common/Combobox';
import SignDialog from '@/features/_shared/eri/SignDialog';
import { useActingEmployee } from '@/lib/acting';
import { listCollegialBodies } from '@/lib/data/collegialBodies';
import { listEmployees } from '@/lib/data/employees';
import {
  chairmanDecideProtocol,
  getProtocol,
  memberDeclineProtocol,
  memberSignProtocol,
  reviewerDecideProtocol,
  submitProtocol,
  updateProtocol,
  CollegialNetworkError,
  CollegialValidationError,
} from '@/lib/data/protocols';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CollegialBody, Employee, Protocol } from '@/types/domain';

import ProtocolDecisionDialog from './ProtocolDecisionDialog';
import { EDITABLE_PROTOCOL_STATUSES, protocolStatusVariant } from './protocolStatus';

const TEMPLATE_KEYS = ['STANDARD', 'BUDGET_DECISION'];

type RejectKind = 'reviewer' | 'member' | 'chairman' | null;

export default function ProtocolDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const { t } = useTranslation(['dashboard', 'common']);
  const roles = useAuthStore((s) => s.user?.roles) ?? [];
  const isAdmin = roles.some((r) => r === 'ROLE_SUPER_ADMIN' || r === 'ROLE_HR_ADMIN');
  const acting = useActingEmployee();

  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [body, setBody] = useState<CollegialBody | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [busy, setBusy] = useState(false);
  const [signOpen, setSignOpen] = useState<'member' | 'chairman' | null>(null);
  const [rejectOpen, setRejectOpen] = useState<RejectKind>(null);

  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTemplate, setEditTemplate] = useState('STANDARD');
  const [editAgenda, setEditAgenda] = useState('');
  const [editParticipants, setEditParticipants] = useState<string[]>([]);
  const [editReviewers, setEditReviewers] = useState<string[]>([]);

  const reload = useCallback(async () => {
    if (!uuid) return;
    try {
      const p = await getProtocol(uuid);
      setProtocol(p);
      const bodies = await listCollegialBodies();
      setBody(bodies.find((b) => b.uuid === p.collegialBodyUuid) ?? null);
    } catch (err) {
      if (err instanceof CollegialNetworkError) toast.error(t('common:errors.network'));
      else toast.error(t('common:errors.unknown'));
    }
  }, [uuid, t]);

  useEffect(() => {
    void reload(); // eslint-disable-line react-hooks/set-state-in-effect
    void (async () => {
      try {
        setEmployees(await listEmployees());
      } catch {
        setEmployees([]);
      }
    })();
  }, [reload]);

  const byUuid = useMemo(() => new Map(employees.map((e) => [e.uuid, e])), [employees]);
  const employeeName = (empUuid: string) => byUuid.get(empUuid)?.fullNameGenerated ?? empUuid;

  function startEdit() {
    if (!protocol) return;
    setEditDate(protocol.protocolDate);
    setEditTemplate(protocol.templateKey);
    setEditAgenda(protocol.agenda);
    setEditParticipants((protocol.participants ?? []).map((p) => p.employeeUuid));
    setEditReviewers((protocol.reviewers ?? []).map((r) => r.employeeUuid));
    setEditing(true);
  }

  function reportError(err: unknown) {
    if (err instanceof CollegialValidationError) toast.error(t(`dashboard:collegial.errors.${err.code}`));
    else if (err instanceof CollegialNetworkError) toast.error(t('common:errors.network'));
    else toast.error(t('common:errors.unknown'));
  }

  async function saveEdit() {
    if (!protocol) return;
    setBusy(true);
    try {
      await updateProtocol(protocol.uuid, {
        protocolDate: editDate,
        templateKey: editTemplate,
        agenda: editAgenda.trim(),
        participantUuids: editParticipants,
        reviewerUuids: editReviewers,
      });
      toast.success(t('dashboard:collegial.protocols.detail.toast.saved'));
      setEditing(false);
      await reload();
    } catch (err) {
      reportError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (!protocol) return;
    setBusy(true);
    try {
      await submitProtocol(protocol.uuid);
      toast.success(t('dashboard:collegial.protocols.detail.toast.submitted'));
      await reload();
    } catch (err) {
      reportError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleReviewerApprove() {
    if (!protocol) return;
    setBusy(true);
    try {
      await reviewerDecideProtocol(protocol.uuid, { approve: true });
      toast.success(t('dashboard:collegial.protocols.detail.toast.reviewer-approved'));
      await reload();
    } catch (err) {
      reportError(err);
    } finally {
      setBusy(false);
    }
  }

  const reviewerOptions: ComboboxOption[] = useMemo(() => {
    const taken = new Set(editReviewers);
    return employees
      .filter((e) => e.status !== 'TERMINATED' && !taken.has(e.uuid))
      .map((e) => ({ value: e.uuid, label: e.fullNameGenerated, sublabel: e.corporateEmail }));
  }, [employees, editReviewers]);

  if (!protocol || !acting) {
    return (
      <div className="space-y-6">
        <LoadingState rows={6} />
      </div>
    );
  }

  const editable = EDITABLE_PROTOCOL_STATUSES.includes(protocol.status);
  const isSecretaryOrAdmin = isAdmin || (body?.secretaryEmployeeUuid === acting.employee.uuid);
  const myReviewer = protocol.reviewers?.find((r) => r.employeeUuid === acting.employee.uuid);
  const myParticipant = protocol.participants?.find((p) => p.employeeUuid === acting.employee.uuid);
  const isChairman = body?.chairmanEmployeeUuid === acting.employee.uuid;

  const canManage = isSecretaryOrAdmin && editable;
  const canSubmit = isSecretaryOrAdmin && editable;
  const canReviewerDecide =
    !!myReviewer && myReviewer.decision === 'PENDING' && protocol.status === 'SENT_FOR_REVIEW';
  const canMemberDecide =
    !!myParticipant && myParticipant.decision === 'PENDING' && protocol.status === 'SENT_TO_MEMBERS';
  const canChairmanDecide = isChairman && protocol.status === 'SENT_TO_CHAIRMAN';

  const rosterUuids = body?.memberEmployeeUuids ?? [];
  const quorumMet = body ? editParticipants.length >= body.quorumMin : false;

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title={protocol.number}
        subtitle={body?.name}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={protocolStatusVariant(protocol.status)}>
          {t(`dashboard:collegial.protocols.status.${protocol.status}`)}
        </Badge>
        <span className="text-sm text-muted-foreground">{protocol.protocolDate}</span>
        <span className="text-sm text-muted-foreground">
          {TEMPLATE_KEYS.includes(protocol.templateKey)
            ? t(`dashboard:collegial.protocols.template.${protocol.templateKey}`)
            : protocol.templateKey}
        </span>
      </div>

      {protocol.reviewNote && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {t('dashboard:collegial.protocols.detail.review-note')}: {protocol.reviewNote}
        </p>
      )}
      {protocol.chairmanNote && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {t('dashboard:collegial.protocols.detail.chairman-note')}: {protocol.chairmanNote}
        </p>
      )}

      {!editing ? (
        <div className="space-y-2">
          <h2 className="font-heading text-base font-semibold text-ink">
            {t('dashboard:collegial.protocols.detail.agenda-title')}
          </h2>
          <p className="whitespace-pre-wrap text-sm text-body">{protocol.agenda}</p>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-line bg-surface p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('dashboard:collegial.protocols.wizard.field-date')}</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('dashboard:collegial.protocols.wizard.field-template')}</Label>
              <Select value={editTemplate} onValueChange={setEditTemplate}>
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
            <Label>{t('dashboard:collegial.protocols.wizard.field-agenda')}</Label>
            <Textarea rows={5} value={editAgenda} onChange={(e) => setEditAgenda(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{t('dashboard:collegial.protocols.wizard.field-participants')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('dashboard:collegial.protocols.wizard.quorum-hint', {
                selected: editParticipants.length,
                min: body?.quorumMin ?? 0,
              })}
            </p>
            <ul className="space-y-1.5 rounded-lg border border-line p-2">
              {rosterUuids.map((memberUuid) => (
                <li key={memberUuid} className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
                  <Checkbox
                    id={`ep-${memberUuid}`}
                    checked={editParticipants.includes(memberUuid)}
                    onCheckedChange={(c) =>
                      setEditParticipants((prev) =>
                        c === true ? [...prev, memberUuid] : prev.filter((u) => u !== memberUuid),
                      )
                    }
                  />
                  <label htmlFor={`ep-${memberUuid}`} className="cursor-pointer text-sm text-ink">
                    {employeeName(memberUuid)}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Label>{t('dashboard:collegial.protocols.wizard.field-reviewers')}</Label>
            {editReviewers.length > 0 && (
              <ul className="space-y-1.5">
                {editReviewers.map((rUuid) => (
                  <li
                    key={rUuid}
                    className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm"
                  >
                    <span className="truncate text-ink">{employeeName(rUuid)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditReviewers((prev) => prev.filter((u) => u !== rUuid))}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Combobox
              options={reviewerOptions}
              value={null}
              onChange={(v) => setEditReviewers((prev) => [...prev, v])}
              placeholder={t('dashboard:collegial.protocols.wizard.add-reviewer')}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !quorumMet || !editAgenda.trim()} onClick={() => void saveEdit()}>
              <Save className="mr-2 h-4 w-4" />
              {t('common:actions.save')}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setEditing(false)}>
              {t('common:actions.cancel')}
            </Button>
          </div>
        </div>
      )}

      {!editing && (
        <div className="space-y-4">
          <div>
            <h2 className="mb-2 font-heading text-base font-semibold text-ink">
              {t('dashboard:collegial.protocols.detail.reviewers-title')}
            </h2>
            {(protocol.reviewers ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common:labels.none')}</p>
            ) : (
              <ul className="space-y-1.5">
                {protocol.reviewers!.map((r) => (
                  <li
                    key={r.uuid}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm"
                  >
                    <span className="text-ink">{employeeName(r.employeeUuid)}</span>
                    <span className="flex items-center gap-2">
                      {r.note && <span className="text-xs text-muted-foreground">{r.note}</span>}
                      <Badge
                        variant={
                          r.decision === 'APPROVED'
                            ? 'default'
                            : r.decision === 'REJECTED'
                              ? 'destructive'
                              : 'outline'
                        }
                      >
                        {t(`dashboard:collegial.protocols.decision.${r.decision}`)}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="mb-2 font-heading text-base font-semibold text-ink">
              {t('dashboard:collegial.protocols.detail.participants-title')}
            </h2>
            {(protocol.participants ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common:labels.none')}</p>
            ) : (
              <ul className="space-y-1.5">
                {protocol.participants!.map((p) => (
                  <li
                    key={p.uuid}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm"
                  >
                    <span className="text-ink">{employeeName(p.employeeUuid)}</span>
                    <span className="flex items-center gap-2">
                      {p.note && <span className="text-xs text-muted-foreground">{p.note}</span>}
                      <Badge
                        variant={
                          p.decision === 'SIGNED'
                            ? 'default'
                            : p.decision === 'DECLINED'
                              ? 'destructive'
                              : 'outline'
                        }
                      >
                        {t(`dashboard:collegial.protocols.participantDecision.${p.decision}`)}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {!editing && (
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Button variant="outline" disabled={busy} onClick={startEdit}>
              {t('common:actions.edit')}
            </Button>
          )}
          {canSubmit && (
            <Button disabled={busy} onClick={() => void handleSubmit()}>
              <Send className="mr-2 h-4 w-4" />
              {t('dashboard:collegial.protocols.detail.submit')}
            </Button>
          )}
          {canReviewerDecide && (
            <>
              <Button disabled={busy} onClick={() => void handleReviewerApprove()}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('dashboard:collegial.protocols.detail.reviewer-approve')}
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => setRejectOpen('reviewer')}>
                <XCircle className="mr-2 h-4 w-4" />
                {t('common:actions.reject')}
              </Button>
            </>
          )}
          {canMemberDecide && (
            <>
              <Button disabled={busy} onClick={() => setSignOpen('member')}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                {t('dashboard:collegial.protocols.detail.member-sign')}
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => setRejectOpen('member')}>
                <XCircle className="mr-2 h-4 w-4" />
                {t('dashboard:collegial.protocols.detail.member-decline')}
              </Button>
            </>
          )}
          {canChairmanDecide && (
            <>
              <Button disabled={busy} onClick={() => setSignOpen('chairman')}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                {t('dashboard:collegial.protocols.detail.chairman-approve')}
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => setRejectOpen('chairman')}>
                <XCircle className="mr-2 h-4 w-4" />
                {t('common:actions.reject')}
              </Button>
            </>
          )}
        </div>
      )}

      <SignDialog
        open={signOpen === 'member'}
        onOpenChange={(open) => !open && setSignOpen(null)}
        resourceUuid={protocol.uuid}
        actorUuid={acting.employee.uuid}
        onDone={() => void reload()}
        onSign={(certificateUuid, signatureHex) =>
          memberSignProtocol(protocol.uuid, { certificateUuid, signatureHex })
        }
        successKey="dashboard:collegial.protocols.detail.sign.success-member"
        resolveErrorKey={(err) => {
          if (err instanceof CollegialValidationError) return `dashboard:collegial.errors.${err.code}`;
          if (err instanceof CollegialNetworkError) return 'common:errors.network';
          return undefined;
        }}
      />

      <SignDialog
        open={signOpen === 'chairman'}
        onOpenChange={(open) => !open && setSignOpen(null)}
        resourceUuid={protocol.uuid}
        actorUuid={acting.employee.uuid}
        onDone={() => void reload()}
        onSign={(certificateUuid, signatureHex) =>
          chairmanDecideProtocol(protocol.uuid, { approve: true, certificateUuid, signatureHex })
        }
        successKey="dashboard:collegial.protocols.detail.sign.success-chairman"
        resolveErrorKey={(err) => {
          if (err instanceof CollegialValidationError) return `dashboard:collegial.errors.${err.code}`;
          if (err instanceof CollegialNetworkError) return 'common:errors.network';
          return undefined;
        }}
      />

      <ProtocolDecisionDialog
        open={rejectOpen === 'reviewer'}
        onOpenChange={(open) => !open && setRejectOpen(null)}
        title={t('dashboard:collegial.protocols.detail.reject.reviewer-title')}
        description={t('dashboard:collegial.protocols.detail.reject.description')}
        onReject={(note) => reviewerDecideProtocol(protocol.uuid, { approve: false, note })}
        onDone={() => void reload()}
      />

      <ProtocolDecisionDialog
        open={rejectOpen === 'member'}
        onOpenChange={(open) => !open && setRejectOpen(null)}
        title={t('dashboard:collegial.protocols.detail.reject.member-title')}
        description={t('dashboard:collegial.protocols.detail.reject.description')}
        onReject={(note) => memberDeclineProtocol(protocol.uuid, note)}
        onDone={() => void reload()}
      />

      <ProtocolDecisionDialog
        open={rejectOpen === 'chairman'}
        onOpenChange={(open) => !open && setRejectOpen(null)}
        title={t('dashboard:collegial.protocols.detail.reject.chairman-title')}
        description={t('dashboard:collegial.protocols.detail.reject.description')}
        onReject={(note) => chairmanDecideProtocol(protocol.uuid, { approve: false, note })}
        onDone={() => void reload()}
      />
    </div>
  );
}
