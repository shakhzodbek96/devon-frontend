import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Pencil, Power } from 'lucide-react';

import { Button } from '@/components/ui/button';
import MetaFileField, { type FileMetaInput } from '@/components/common/MetaFileField';
import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { formatDate } from '@/i18n/uz-locale';
import { formatBytes } from '@/lib/format';
import {
  EmployeeValidationError,
  MockNetworkError,
  terminateEmployee,
} from '@/lib/data/employees';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Employee } from '@/types/domain';

import UpdateEmployeeSheet from './UpdateEmployeeSheet';

interface Props {
  employee: Employee;
  onChanged: (next: Employee) => void;
}

function formatPinfl(pinfl: string): string {
  return pinfl.replace(/(.{4})/g, '$1 ').trim();
}

export default function ProfileInfoTab({ employee, onChanged }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const actor = useAuthStore((s) => s.user?.uuid ?? '');
  const [editOpen, setEditOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [terminationExtract, setTerminationExtract] = useState<FileMetaInput | null>(null);
  const [extractErrorKey, setExtractErrorKey] = useState<string | undefined>();

  const terminated = employee.status === 'TERMINATED';

  function onTerminateOpenChange(open: boolean) {
    setTerminateOpen(open);
    // Reset the attachment + any pick error whenever the dialog closes so a
    // re-open starts clean.
    if (!open) {
      setTerminationExtract(null);
      setExtractErrorKey(undefined);
    }
  }

  const rows: { key: string; label: string; value: string | null }[] = [
    {
      key: 'pinfl',
      label: t('dashboard:employees.profile.info.fields.pinfl'),
      value: formatPinfl(employee.pinfl),
    },
    {
      key: 'gender',
      label: t('dashboard:employees.profile.info.fields.gender'),
      value: t(`dashboard:employees.profile.info.gender.${employee.gender}`),
    },
    {
      key: 'birthDate',
      label: t('dashboard:employees.profile.info.fields.birth-date'),
      value: employee.birthDate ? formatDate(employee.birthDate) : null,
    },
    {
      key: 'passport',
      label: t('dashboard:employees.profile.info.fields.passport'),
      value: employee.passportSeries ?? null,
    },
    {
      key: 'mobilePhone',
      label: t('dashboard:employees.profile.info.fields.mobile-phone'),
      value: employee.mobilePhone,
    },
    {
      key: 'workPhone',
      label: t('dashboard:employees.profile.info.fields.work-phone'),
      value:
        [employee.workPhone, employee.internalExtension && `(${employee.internalExtension})`]
          .filter(Boolean)
          .join(' ') || null,
    },
    {
      key: 'corporateEmail',
      label: t('dashboard:employees.profile.info.fields.corporate-email'),
      value: employee.corporateEmail,
    },
    {
      key: 'personalEmail',
      label: t('dashboard:employees.profile.info.fields.personal-email'),
      value: employee.personalEmail ?? null,
    },
    {
      key: 'hireDate',
      label: t('dashboard:employees.profile.info.fields.hire-date'),
      value: employee.hireDate ? formatDate(employee.hireDate) : null,
    },
    {
      key: 'terminationDate',
      label: t('dashboard:employees.profile.info.fields.termination-date'),
      value: employee.terminationDate ? formatDate(employee.terminationDate) : null,
    },
    {
      key: 'employmentType',
      label: t('dashboard:employees.profile.info.fields.employment-type'),
      value: t(`dashboard:employees.profile.info.employment.${employee.employmentType}`),
    },
    {
      key: 'orderExtract',
      label: t('dashboard:employees.profile.info.fields.order-extract'),
      value: employee.employmentOrderExtract
        ? `${employee.employmentOrderExtract.fileName} (${formatBytes(
            employee.employmentOrderExtract.fileSize,
          )})`
        : null,
    },
    {
      key: 'positionInstruction',
      label: t('dashboard:employees.profile.info.fields.position-instruction'),
      value: employee.positionInstruction
        ? `${employee.positionInstruction.fileName} (${formatBytes(
            employee.positionInstruction.fileSize,
          )})`
        : null,
    },
    {
      key: 'terminationOrderExtract',
      label: t('dashboard:employees.profile.info.fields.termination-order-extract'),
      value: employee.terminationOrderExtract
        ? `${employee.terminationOrderExtract.fileName} (${formatBytes(
            employee.terminationOrderExtract.fileSize,
          )})`
        : null,
    },
  ];

  async function onConfirmTerminate() {
    if (!terminationExtract) {
      // Unreachable while the Confirm button is gated, but keep the policy
      // explicit in case the gate ever changes.
      setExtractErrorKey('common:errors.termination-extract-missing');
      return;
    }
    try {
      setTerminating(true);
      await terminateEmployee(employee.uuid, actor, terminationExtract);
      toast.success(
        t('dashboard:employees.profile.terminate.success', { name: employee.fullNameGenerated }),
      );
      onTerminateOpenChange(false);
      // Re-navigate to the same route so the page re-fetches the now-terminated
      // employee. Replacing the entry keeps the back button intact.
      navigate(`/employees/${employee.uuid}`, { replace: true });
    } catch (err) {
      if (err instanceof EmployeeValidationError) {
        toast.error(t(`common:errors.${err.code}`));
      } else if (err instanceof MockNetworkError) {
        toast.error(t('common:errors.network'));
      } else {
        toast.error(t('common:errors.unknown'));
      }
    } finally {
      setTerminating(false);
    }
  }

  return (
    <div className="pt-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">
          {t('dashboard:employees.profile.info.heading')}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1 h-4 w-4" />
            {t('dashboard:employees.profile.info.edit')}
          </Button>
          {!terminated && (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
              onClick={() => setTerminateOpen(true)}
            >
              <Power className="mr-1 h-4 w-4" />
              {t('dashboard:employees.profile.terminate.cta')}
            </Button>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border border-line bg-surface p-5 md:grid-cols-2">
        {rows
          // Termination-only fields are meaningless until the employee is
          // terminated — hide them rather than render an empty "—" row.
          .filter(
            (row) =>
              terminated ||
              (row.key !== 'terminationDate' && row.key !== 'terminationOrderExtract'),
          )
          .map((row) => (
          <div key={row.key} className="flex flex-col gap-0.5 border-b border-line/50 pb-2 last:border-b-0 md:border-b-0 md:pb-0">
            <dt className="text-xs font-medium text-muted-foreground">{row.label}</dt>
            <dd className="text-sm text-ink">
              {row.value ?? (
                <span className="text-muted-foreground">
                  {t('dashboard:employees.profile.info.empty-value')}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <UpdateEmployeeSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        employee={employee}
        onSaved={onChanged}
      />

      <ResponsiveDialog
        open={terminateOpen}
        onOpenChange={onTerminateOpenChange}
        title={t('dashboard:employees.profile.terminate.title')}
        description={t('dashboard:employees.profile.terminate.body', {
          name: employee.fullNameGenerated,
        })}
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onTerminateOpenChange(false)}
              disabled={terminating}
            >
              {t('dashboard:employees.profile.terminate.cancel')}
            </Button>
            <Button
              onClick={onConfirmTerminate}
              disabled={terminating || !terminationExtract}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {terminating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('dashboard:employees.profile.terminate.confirm')}
            </Button>
          </div>
        }
      >
        <MetaFileField
          id="terminationOrderExtract"
          labelKey="dashboard:employees.profile.terminate.order-extract-label"
          hintKey="dashboard:employees.profile.terminate.order-extract-hint"
          value={terminationExtract}
          errorKey={extractErrorKey}
          onChange={(meta) => {
            setExtractErrorKey(undefined);
            setTerminationExtract(meta);
          }}
          onError={(key) => setExtractErrorKey(key)}
        />
      </ResponsiveDialog>
    </div>
  );
}
