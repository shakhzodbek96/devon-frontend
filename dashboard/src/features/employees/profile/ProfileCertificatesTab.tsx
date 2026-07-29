import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus, KeyRound } from 'lucide-react';

import LoadingState from '@/components/common/LoadingState';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/i18n/uz-locale';
import { listCertificates } from '@/lib/data/certificates';
import type { Certificate, Employee } from '@/types/domain';

interface Props {
  employee: Employee;
}

export default function ProfileCertificatesTab({ employee }: Props) {
  const { t } = useTranslation(['dashboard']);
  const [rows, setRows] = useState<Certificate[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const r = await listCertificates({ employeeUuid: employee.uuid });
      if (!active) return;
      r.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setRows(r);
    })();
    return () => {
      active = false;
    };
  }, [employee.uuid]);

  if (rows === null) return <LoadingState rows={3} />;

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">
          {t('dashboard:employees.profile.certs.heading')}
        </h3>
        <Button asChild variant="outline" size="sm">
          <Link to={`/certificates?upload=1&employee=${employee.uuid}`}>
            <Plus className="mr-1 h-4 w-4" />
            {t('dashboard:employees.profile.certs.upload-cta')}
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-surface-2/40 py-8 text-center text-sm text-muted-foreground">
          {t('dashboard:employees.profile.certs.empty')}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((cert) => (
            <li
              key={cert.uuid}
              className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary-deep">
                  <KeyRound className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{cert.subjectCommonName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard:employees.profile.certs.serial-label')}:{' '}
                    <span className="font-mono tabular-nums">{cert.serialNumber}</span>
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {t('dashboard:employees.profile.certs.valid-window', {
                      from: formatDate(cert.validFrom),
                      to: formatDate(cert.validTo),
                    })}
                  </p>
                </div>
              </div>
              <StatusBadge status={cert.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
