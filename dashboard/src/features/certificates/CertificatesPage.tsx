import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Check, Plus, X } from 'lucide-react';

import LoadingState from '@/components/common/LoadingState';
import PageHeader from '@/components/common/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/lib/use-media-query';
import {
  approveCertificate,
  listCertificates,
  MockNetworkError,
  reorderCertificates,
} from '@/lib/data/certificates';
import { listEmployees } from '@/lib/data/employees';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Certificate, Employee } from '@/types/domain';

import ApproveDialog from './ApproveDialog';
import CertificateDetailsSheet from './CertificateDetailsSheet';
import CertificatesKanban, {
  type DnDDropInput,
  type DnDReorderInput,
} from './CertificatesKanban';
import CertificatesTabsMobile from './CertificatesTabsMobile';
import RejectDialog from './RejectDialog';
import RevokeDialog from './RevokeDialog';

type ActiveDialog = 'approve' | 'reject' | 'revoke' | null;

export default function CertificatesPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const actor = useAuthStore((s) => s.user?.uuid ?? '');

  const [certs, setCerts] = useState<Certificate[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // `openCert` controls only the right-side CertificateDetailsSheet.
  // `dialogCert` controls the approve/reject/revoke action dialogs, kept
  // separate so a drag-triggered dialog (no sheet) and a sheet-triggered
  // dialog (sheet stays behind for context) don't fight each other. The
  // previous design conflated both on `openCert`, which meant the
  // drag-triggered revoke spawned BOTH the sheet AND the dialog — sheet's
  // overlay buried the dialog, and cancelling the dialog left the sheet
  // stuck open.
  const [openCert, setOpenCert] = useState<Certificate | null>(null);
  const [dialogCert, setDialogCert] = useState<Certificate | null>(null);
  const [dialog, setDialog] = useState<ActiveDialog>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  function closeDialog() {
    setDialog(null);
    setDialogCert(null);
  }

  // Step-11 profile cert tab CTA routes here with `?upload=1&employee=<uuid>`.
  // Bounce straight to the upload page so the user doesn't get dropped on the
  // board first.
  useEffect(() => {
    if (searchParams.get('upload') === '1') {
      const empId = searchParams.get('employee');
      navigate(`/certificates/upload${empId ? `?employee=${empId}` : ''}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const reload = useCallback(async () => {
    const [c, e] = await Promise.all([listCertificates(), listEmployees()]);
    setCerts(c);
    setEmployees(e);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function toggle(uuid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  }

  async function onDrop({ certUuid, fromStatus, toStatus }: DnDDropInput) {
    if (fromStatus === toStatus) return;
    const cert = certs?.find((c) => c.uuid === certUuid);
    if (!cert) return;

    // PENDING_APPROVAL -> ACTIVE: drop is the confirmation. Optimistic UI
    // patch + audit-tracked approveCertificate + rollback on failure.
    // Prepend the cert so it surfaces at the TOP of the destination column —
    // mirrors approveCertificate's mock-backend reorder so the position is
    // identical before and after reload (no visual snap). Top-of-column
    // also matches Linear / GitHub Issues convention: most-recent activity
    // surfaces first.
    if (fromStatus === 'PENDING_APPROVAL' && toStatus === 'ACTIVE') {
      const originalIndex = certs?.findIndex((c) => c.uuid === certUuid) ?? -1;
      setCerts((prev) => {
        if (!prev) return prev;
        const target = prev.find((c) => c.uuid === certUuid);
        if (!target) return prev;
        return [{ ...target, status: 'ACTIVE' }, ...prev.filter((c) => c.uuid !== certUuid)];
      });
      try {
        await approveCertificate(certUuid, actor);
        toast.success(t('dashboard:certificates.toast.approved'));
        await reload();
      } catch (err) {
        // Roll back: restore the cert at its original index with PENDING status.
        setCerts((prev) => {
          if (!prev) return prev;
          const without = prev.filter((c) => c.uuid !== certUuid);
          const target = prev.find((c) => c.uuid === certUuid);
          if (!target) return prev;
          const restored = { ...target, status: 'PENDING_APPROVAL' as const };
          const next = [...without];
          next.splice(Math.max(0, originalIndex), 0, restored);
          return next;
        });
        toast.error(
          err instanceof MockNetworkError
            ? t('common:errors.network')
            : t('common:errors.unknown'),
        );
      }
      return;
    }

    // ACTIVE -> REVOKED: needs a reason. Defer the visual move until the
    // dialog confirms; spawn RevokeDialog pre-targeted at this cert.
    // Crucially: do NOT setOpenCert(cert) — opening the sheet alongside
    // the dialog buries the dialog under the sheet's overlay and leaves
    // the sheet stuck open if the user cancels.
    if (fromStatus === 'ACTIVE' && toStatus === 'REVOKED') {
      setDialogCert(cert);
      setDialog('revoke');
      return;
    }

    // Anything else is forbidden — quiet toast, no visual move (card stays
    // in its source column since we never moved it).
    toast.warning(t('dashboard:certificates.dnd.forbidden'));
  }

  async function onReorder({ activeUuid, overUuid }: DnDReorderInput) {
    if (!certs) return;
    const oldIndex = certs.findIndex((c) => c.uuid === activeUuid);
    const newIndex = certs.findIndex((c) => c.uuid === overUuid);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    // Snapshot so we can roll back on failure.
    const snapshot = certs;
    const next = [...certs];
    const [moved] = next.splice(oldIndex, 1);
    if (!moved) return;
    next.splice(newIndex, 0, moved);

    setCerts(next); // optimistic — column re-groups instantly
    try {
      // Persist the new array order so reload() doesn't snap back.
      await reorderCertificates(next.map((c) => c.uuid));
    } catch (err) {
      setCerts(snapshot);
      toast.error(
        err instanceof MockNetworkError
          ? t('common:errors.network')
          : t('common:errors.unknown'),
      );
    }
  }

  async function bulkApprove() {
    const ids = Array.from(selected);
    setBulkBusy(true);
    let ok = 0;
    for (const id of ids) {
      try {
        await approveCertificate(id, actor);
        ok++;
      } catch (err) {
        // 3% simulated-failure rate per mock backend — skip and report the
        // actual success count at the end.
        if (!(err instanceof MockNetworkError)) {
          // Unexpected error — log to console for diagnosis, still continue.
          console.error('Bulk approve failed for', id, err);
        }
      }
    }
    setBulkBusy(false);
    toast.success(t('dashboard:certificates.toast.bulk-approved', { count: ok }));
    setSelected(new Set());
    await reload();
  }

  const pendingCount = useMemo(
    () => certs?.filter((c) => c.status === 'PENDING_APPROVAL').length ?? 0,
    [certs],
  );

  const openEmployee = useMemo(
    () => (openCert ? employees.find((e) => e.uuid === openCert.employeeUuid) : undefined),
    [openCert, employees],
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title={t('dashboard:certificates.title')}
        subtitle={t('dashboard:certificates.subtitle', { count: pendingCount })}
        actions={
          <Button asChild>
            <Link to="/certificates/upload">
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard:certificates.upload-cta')}
            </Link>
          </Button>
        }
      />

      {selected.size > 0 && (
        <Alert className="flex flex-col gap-3 border-primary/30 bg-surface-2 md:flex-row md:items-center md:justify-between">
          <AlertDescription className="text-ink">
            {t('dashboard:certificates.bulk.selected', { count: selected.size })}
          </AlertDescription>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelected(new Set())}
              disabled={bulkBusy}
            >
              <X className="mr-1 h-4 w-4" />
              {t('common:actions.cancel')}
            </Button>
            <Button size="sm" onClick={bulkApprove} disabled={bulkBusy}>
              <Check className="mr-1 h-4 w-4" />
              {t('dashboard:certificates.bulk.approve-cta')} ({selected.size})
            </Button>
          </div>
        </Alert>
      )}

      {!certs ? (
        <LoadingState rows={6} />
      ) : isDesktop ? (
        <CertificatesKanban
          certs={certs}
          employees={employees}
          selected={selected}
          onToggleSelect={toggle}
          onOpen={setOpenCert}
          onDrop={onDrop}
          onReorder={onReorder}
        />
      ) : (
        <CertificatesTabsMobile
          certs={certs}
          employees={employees}
          selected={selected}
          onToggleSelect={toggle}
          onOpen={setOpenCert}
        />
      )}

      <CertificateDetailsSheet
        cert={openCert}
        employee={openEmployee}
        onClose={() => setOpenCert(null)}
        onApprove={(c) => {
          setDialogCert(c);
          setDialog('approve');
        }}
        onReject={(c) => {
          setDialogCert(c);
          setDialog('reject');
        }}
        onRevoke={(c) => {
          setDialogCert(c);
          setDialog('revoke');
        }}
      />

      {dialogCert && dialog === 'approve' && (
        <ApproveDialog
          open
          onOpenChange={(o) => !o && closeDialog()}
          cert={dialogCert}
          employee={employees.find((e) => e.uuid === dialogCert.employeeUuid)}
          onDone={async () => {
            closeDialog();
            setOpenCert(null);
            await reload();
          }}
        />
      )}
      {dialogCert && dialog === 'reject' && (
        <RejectDialog
          open
          onOpenChange={(o) => !o && closeDialog()}
          cert={dialogCert}
          employee={employees.find((e) => e.uuid === dialogCert.employeeUuid)}
          onDone={async () => {
            closeDialog();
            setOpenCert(null);
            await reload();
          }}
        />
      )}
      {dialogCert && dialog === 'revoke' && (
        <RevokeDialog
          open
          onOpenChange={(o) => !o && closeDialog()}
          cert={dialogCert}
          employee={employees.find((e) => e.uuid === dialogCert.employeeUuid)}
          onDone={async () => {
            closeDialog();
            setOpenCert(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}
