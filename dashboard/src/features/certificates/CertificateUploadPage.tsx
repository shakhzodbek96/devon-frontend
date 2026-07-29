import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Loader2, ShieldCheck, Upload, X } from 'lucide-react';

import Combobox, { type ComboboxOption } from '@/components/common/Combobox';
import LoadingState from '@/components/common/LoadingState';
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
import { formatDate } from '@/i18n/uz-locale';
import { formatBytes } from '@/lib/format';
import {
  CertificateValidationError,
  MockNetworkError,
  uploadCertificate,
} from '@/lib/data/certificates';
import { listEmployees } from '@/lib/data/employees';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Certificate, Employee } from '@/types/domain';

import {
  fakeExtractFromPfx,
  FakePfxParseError,
  MAX_PFX_SIZE_BYTES,
  type ExtractedCertMeta,
} from './FakePfxParser';

type CertType = Certificate['certificateType'];

export default function CertificateUploadPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const actor = useAuthStore((s) => s.user?.uuid ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [employeeUuid, setEmployeeUuid] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [meta, setMeta] = useState<ExtractedCertMeta | null>(null);
  const [certType, setCertType] = useState<CertType>('SIGNING');
  const [autoApprove, setAutoApprove] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pinflMismatch, setPinflMismatch] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const all = await listEmployees();
      if (!active) return;
      // Pickable list = active workforce. TERMINATED employees can't receive
      // new certs.
      setEmployees(all.filter((e) => e.status !== 'TERMINATED'));

      // Pre-fill from `?employee=<uuid>` (set by the step-11 profile cert tab).
      const queryEmp = searchParams.get('employee');
      if (queryEmp && all.some((e) => e.uuid === queryEmp)) {
        setEmployeeUuid(queryEmp);
      }
    })();
    return () => {
      active = false;
    };
  }, [searchParams]);

  const employee = useMemo(
    () => employees?.find((e) => e.uuid === employeeUuid) ?? null,
    [employees, employeeUuid],
  );

  const employeeOptions: ComboboxOption[] = useMemo(
    () =>
      (employees ?? []).map((e) => ({
        value: e.uuid,
        label: e.fullNameGenerated,
        sublabel: e.corporateEmail,
      })),
    [employees],
  );

  function onClose() {
    if (employee) navigate(`/employees/${employee.uuid}`);
    else navigate('/certificates');
  }

  function onPickFile(picked: File | null) {
    setFileError(null);
    setMeta(null);
    setExtractError(null);
    setPinflMismatch(false);
    if (!picked) {
      setFile(null);
      return;
    }
    if (picked.size > MAX_PFX_SIZE_BYTES) {
      setFile(null);
      setFileError(t('dashboard:certificates.upload.errors.pfx-too-large'));
      return;
    }
    setFile(picked);
  }

  async function extract() {
    if (!employee) {
      setExtractError(t('dashboard:certificates.upload.errors.no-employee'));
      return;
    }
    if (!file) {
      setExtractError(t('dashboard:certificates.upload.errors.no-file'));
      return;
    }
    if (!password.trim()) {
      setExtractError(t('dashboard:certificates.upload.errors.no-password'));
      return;
    }
    setExtracting(true);
    setExtractError(null);
    try {
      const result = await fakeExtractFromPfx(
        file,
        password,
        employee.pinfl,
        employee.fullNameGenerated,
      );
      setMeta(result);
      // Defense-in-depth: even though the parser fabricates the PINFL to match,
      // a real X.509 parser could surface a mismatch — display the same check.
      setPinflMismatch(result.subjectPinfl !== employee.pinfl);
    } catch (err) {
      if (err instanceof FakePfxParseError) {
        setExtractError(t(`dashboard:certificates.upload.errors.${err.code}`));
      } else {
        setExtractError(t('common:errors.unknown'));
      }
    } finally {
      setExtracting(false);
    }
  }

  async function submit() {
    if (!employee || !meta || pinflMismatch) return;
    setSubmitting(true);
    try {
      // Mock E-IMZO challenge-response handshake per master §17 ("fake the
      // WebSocket with a delay"). Real system would round-trip a signed nonce
      // through the local PKI plugin before the upload commits.
      await new Promise((r) => setTimeout(r, 1500));
      const cert = await uploadCertificate(
        {
          employeeUuid: employee.uuid,
          serialNumber: meta.serialNumber,
          thumbprint: meta.thumbprint,
          subjectPinfl: meta.subjectPinfl,
          subjectCommonName: meta.subjectCommonName,
          subjectOrganization: meta.subjectOrganization,
          issuerName: meta.issuerName,
          validFrom: meta.validFrom,
          validTo: meta.validTo,
          keyUsage: meta.keyUsage,
          certificateType: certType,
          autoApprove,
        },
        actor,
      );
      toast.success(
        t('dashboard:certificates.upload.success', { name: employee.fullNameGenerated }),
      );
      // Bounce to the originating profile if we have one, else the cert board.
      // Replace so the user can still go back to the page they came from.
      const cameFromProfile = searchParams.get('employee') === employee.uuid;
      navigate(cameFromProfile ? `/employees/${employee.uuid}` : '/certificates', {
        replace: true,
      });
      void cert;
    } catch (err) {
      if (err instanceof CertificateValidationError) {
        toast.error(t(`dashboard:certificates.upload.errors.${err.code}`));
      } else if (err instanceof MockNetworkError) {
        toast.error(t('common:errors.network'));
      } else {
        toast.error(t('common:errors.unknown'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (employees === null) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <LoadingState rows={4} />
      </div>
    );
  }

  const canExtract = !!employee && !!file && password.trim().length > 0 && !extracting;
  const canSubmit = !!meta && !pinflMismatch && !submitting;

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Mobile-only top bar — wizard parity */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={t('common:actions.close')}
        >
          <X className="h-5 w-5" />
        </Button>
        <h1 className="truncate text-base font-semibold text-ink">
          {t('dashboard:certificates.upload.title')}
        </h1>
      </header>

      {/* Desktop header */}
      <header className="hidden items-center justify-between border-b border-line bg-surface px-6 py-4 md:flex">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1">
            <Link to={employee ? `/employees/${employee.uuid}` : '/certificates'}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t('dashboard:certificates.upload.back')}
            </Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {t('dashboard:certificates.upload.title')}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('dashboard:certificates.upload.subtitle')}
          </p>
        </div>
        <Button variant="ghost" onClick={onClose}>
          {t('common:actions.cancel')}
        </Button>
      </header>

      <div className="flex flex-1 flex-col md:items-center md:py-8">
        <div className="flex w-full flex-1 flex-col md:max-w-3xl md:rounded-xl md:border md:border-line md:bg-surface md:shadow-sm">
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <ol className="space-y-6">
              {/* Step 1 — pick employee */}
              <Step n={1} title={t('dashboard:certificates.upload.step-employee')}>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard:certificates.upload.step-employee-hint')}
                </p>
                <Combobox
                  options={employeeOptions}
                  value={employeeUuid || null}
                  onChange={(v) => {
                    setEmployeeUuid(v);
                    // Picking a different employee invalidates the parsed
                    // metadata (subjectPinfl was generated for the prior one).
                    setMeta(null);
                    setPinflMismatch(false);
                  }}
                  placeholder={t('dashboard:certificates.upload.step-employee')}
                  searchPlaceholder={t('dashboard:employees.list.search-placeholder')}
                />
              </Step>

              {/* Step 2 — file picker */}
              <Step n={2} title={t('dashboard:certificates.upload.step-file')}>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard:certificates.upload.step-file-hint')}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pfx,.p12"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {t('dashboard:certificates.upload.step-file-cta')}
                  </Button>
                  {file && (
                    <span className="inline-flex items-center gap-2 text-sm text-body">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {t('dashboard:certificates.upload.step-file-selected', {
                        name: file.name,
                        size: formatBytes(file.size),
                      })}
                    </span>
                  )}
                </div>
                {fileError && <p className="text-xs text-destructive">{fileError}</p>}
              </Step>

              {/* Step 3 — password */}
              <Step n={3} title={t('dashboard:certificates.upload.step-password')}>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard:certificates.upload.step-password-hint')}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="pfx-password" className="sr-only">
                    {t('dashboard:certificates.upload.step-password')}
                  </Label>
                  <Input
                    id="pfx-password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      // Changing the password invalidates the prior parse.
                      if (meta) setMeta(null);
                      setPinflMismatch(false);
                    }}
                    placeholder="••••••••"
                    autoComplete="off"
                  />
                </div>
                <Button type="button" onClick={extract} disabled={!canExtract}>
                  {extracting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {extracting
                    ? t('dashboard:certificates.upload.extracting')
                    : t('dashboard:certificates.upload.extract-cta')}
                </Button>
                {extractError && (
                  <p className="text-xs text-destructive">{extractError}</p>
                )}
              </Step>

              {/* Step 4 — confirm */}
              {meta && (
                <Step n={4} title={t('dashboard:certificates.upload.step-confirm')}>
                  {pinflMismatch && (
                    <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                      {t('dashboard:certificates.upload.errors.pinfl-mismatch')}
                    </p>
                  )}
                  <dl className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface-2/30 p-4 text-sm md:grid-cols-2">
                    <DLRow label={t('dashboard:certificates.details.owner')}>
                      {employee?.fullNameGenerated}
                    </DLRow>
                    <DLRow label={t('dashboard:certificates.details.issuer')}>
                      {meta.issuerName}
                    </DLRow>
                    <DLRow label={t('dashboard:certificates.details.serial')}>
                      <span className="break-all font-mono text-xs tabular-nums">
                        {meta.serialNumber}
                      </span>
                    </DLRow>
                    <DLRow label={t('dashboard:certificates.details.thumbprint')}>
                      <span className="break-all font-mono text-xs tabular-nums">
                        {meta.thumbprint}
                      </span>
                    </DLRow>
                    <DLRow label={t('dashboard:certificates.details.validity')}>
                      <span className="tabular-nums">
                        {formatDate(meta.validFrom)} – {formatDate(meta.validTo)}
                      </span>
                    </DLRow>
                    <DLRow label={t('dashboard:certificates.details.key-usage')}>
                      {meta.keyUsage.join(', ')}
                    </DLRow>
                  </dl>

                  <div className="space-y-2">
                    <Label htmlFor="cert-type">
                      {t('dashboard:certificates.upload.type-label')}
                    </Label>
                    <Select value={certType} onValueChange={(v) => setCertType(v as CertType)}>
                      <SelectTrigger id="cert-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SIGNING">
                          {t('dashboard:certificates.upload.types.SIGNING')}
                        </SelectItem>
                        <SelectItem value="ENCRYPTION">
                          {t('dashboard:certificates.upload.types.ENCRYPTION')}
                        </SelectItem>
                        <SelectItem value="BOTH">
                          {t('dashboard:certificates.upload.types.BOTH')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface p-3">
                    <Checkbox
                      checked={autoApprove}
                      onCheckedChange={(checked) => setAutoApprove(checked === true)}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium text-ink">
                        {t('dashboard:certificates.upload.auto-approve.label')}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {t('dashboard:certificates.upload.auto-approve.hint')}
                      </p>
                    </div>
                  </label>

                  {submitting && (
                    <p className="inline-flex items-center gap-2 text-xs text-primary-deep">
                      <ShieldCheck className="h-3.5 w-3.5 animate-pulse" />
                      {t('dashboard:certificates.upload.challenge-info')}
                    </p>
                  )}
                </Step>
              )}
            </ol>
          </div>

          <footer className="pb-safe sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 pt-4 md:px-8">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="button" onClick={submit} disabled={!canSubmit}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('dashboard:certificates.upload.submit')}
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-canvas">
          {n}
        </span>
        <h3 className="text-base font-semibold text-ink">{title}</h3>
      </div>
      <div className="space-y-3 pl-8">{children}</div>
    </li>
  );
}

function DLRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}
