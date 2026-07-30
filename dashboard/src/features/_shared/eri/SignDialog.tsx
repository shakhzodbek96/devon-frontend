import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CheckCircle2, KeySquare, ShieldCheck } from 'lucide-react';

import ResponsiveDialog from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/i18n/uz-locale';
import { listCertificates } from '@/lib/data/certificates';
import {
  DocumentValidationError,
  LetterValidationError,
  MockNetworkError,
  signDocument,
} from '@/lib/mock-backend';
import type { Certificate } from '@/types/domain';

import { FakeEriSigner } from './FakeEriSigner';

const PIN_PATTERN = /^\d{6}$/;

type Phase = 'pick' | 'signing' | 'done';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Document OR letter uuid — the resource being signed. */
  resourceUuid: string;
  /** Acting employee — must be the resource's designated signer. */
  actorUuid: string;
  onDone: () => void;
  /**
   * The real sign mutation, bound to the resource. Receives the chosen
   * certificate uuid + the fake ERI signature hex produced by
   * `FakeEriSigner` below (BLOCKED(e-imzo) — real PKCS#7 signing). Defaults
   * to `signDocument(resourceUuid, actorUuid, certificateUuid)` (the mock,
   * which mints its own hex server-side); the real document flow and the
   * letter flow both pass an explicit bound thunk (letters currently ignore
   * the hex — its mock `signLetter` mints its own too, same as documents').
   */
  onSign?: (certificateUuid: string, signatureHex: string) => Promise<unknown>;
  /** Which `dashboard:<ns>.errors.*` table maps thrown validation codes. */
  errorNamespace?: 'documents' | 'letters';
  /** Success-state copy key — the only domain-specific string in this dialog. */
  successKey?: string;
  /**
   * Escape hatch for callers whose `onSign` mutation throws an error class
   * other than `DocumentValidationError`/`LetterValidationError` (e.g. the
   * tabel head-decide flow's `TabelValidationError`). Return the
   * `dashboard:...` translation key to show + close the dialog, or
   * `undefined` to fall through to the built-in handling below.
   */
  resolveErrorKey?: (err: unknown) => string | undefined;
}

/**
 * ERI signing ceremony — step-12 upload theatre, signing flavour: pick an
 * ACTIVE certificate, enter a PIN (any 6 digits; never sent anywhere), watch
 * the simulated E-IMZO challenge-response, land on the success state. Shared
 * by document signing (step 19) and letter signing (step 21); the only
 * domain-specific bits — the mutation, the error namespace, the success copy —
 * are injected.
 */
export default function SignDialog({
  open,
  onOpenChange,
  resourceUuid,
  actorUuid,
  onDone,
  onSign,
  errorNamespace = 'documents',
  successKey = 'dashboard:documents.detail.sign.success',
  resolveErrorKey,
}: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();

  const [certs, setCerts] = useState<Certificate[] | null>(null);
  const [certUuid, setCertUuid] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [phase, setPhase] = useState<Phase>('pick');
  const [signedSerial, setSignedSerial] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCerts(null);
    setCertUuid('');
    setPin('');
    setPinError(false);
    setPhase('pick');
    void (async () => {
      const rows = await listCertificates({ employeeUuid: actorUuid, status: 'ACTIVE' });
      if (cancelled) return;
      setCerts(rows);
      if (rows.length === 1) setCertUuid(rows[0]!.uuid);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, actorUuid]);

  async function sign() {
    if (!PIN_PATTERN.test(pin)) {
      setPinError(true);
      return;
    }
    const cert = certs?.find((c) => c.uuid === certUuid);
    if (!cert) return;
    setPinError(false);
    setPhase('signing');
    try {
      // Theatre first (the visible E-IMZO handshake), then the real mutation
      // — `signatureHex` threads through to `onSign` so the server persists
      // the actual (fake) value the ceremony produced.
      const { signatureHex } = await FakeEriSigner.sign({ resourceUuid });
      await (onSign
        ? onSign(cert.uuid, signatureHex)
        : signDocument(resourceUuid, actorUuid, cert.uuid));
      setSignedSerial(cert.serialNumber);
      setPhase('done');
    } catch (err) {
      setPhase('pick');
      const customKey = resolveErrorKey?.(err);
      // Both domain errors carry a `.code`; a policy failure (e.g. cert-invalid,
      // wrong-status) won't clear on retry, so close + refetch to show truth.
      if (customKey) {
        toast.error(t(customKey));
        onOpenChange(false);
        onDone();
      } else if (err instanceof DocumentValidationError || err instanceof LetterValidationError) {
        toast.error(t(`dashboard:${errorNamespace}.errors.${err.code}`));
        onOpenChange(false);
        onDone();
      } else if (err instanceof MockNetworkError) {
        toast.error(t('common:errors.network'));
      } else {
        toast.error(t('common:errors.unknown'));
      }
    }
  }

  function closeDone() {
    onOpenChange(false);
    onDone();
  }

  const canSign = Boolean(certUuid) && pin.length > 0 && phase === 'pick';

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        // The signing handshake is not cancellable; the done state must
        // funnel through closeDone so the page refetches.
        if (phase === 'signing') return;
        if (!next && phase === 'done') {
          closeDone();
          return;
        }
        onOpenChange(next);
      }}
      title={t('dashboard:documents.detail.sign.title')}
      description={phase === 'pick' ? t('dashboard:documents.detail.sign.description') : undefined}
      footer={
        phase === 'pick' ? (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button disabled={!canSign} onClick={sign}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              {t('dashboard:documents.detail.sign.cta')}
            </Button>
          </>
        ) : phase === 'done' ? (
          <Button onClick={closeDone}>{t('common:actions.close')}</Button>
        ) : undefined
      }
    >
      {phase === 'signing' ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <ShieldCheck className="h-12 w-12 animate-pulse text-primary" aria-hidden />
          <p className="text-sm font-medium text-ink">
            {t('dashboard:documents.detail.sign.signing')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('dashboard:documents.detail.sign.signing-hint')}
          </p>
        </div>
      ) : phase === 'done' ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary" aria-hidden />
          <p className="text-sm font-semibold text-ink">{t(successKey)}</p>
          <p className="font-mono text-xs break-all text-muted-foreground">{signedSerial}</p>
        </div>
      ) : certs === null ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : certs.length === 0 ? (
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            {t('dashboard:documents.detail.sign.no-certs')}
          </p>
          <Button
            variant="outline"
            onClick={() => navigate(`/certificates/upload?employee=${actorUuid}`)}
          >
            <KeySquare className="mr-2 h-4 w-4" />
            {t('dashboard:documents.detail.sign.upload-cert')}
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <RadioGroup value={certUuid} onValueChange={setCertUuid} className="space-y-2">
            {certs.map((cert) => (
              <Label
                key={cert.uuid}
                htmlFor={`cert-${cert.uuid}`}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-brand-soft/30"
              >
                <RadioGroupItem id={`cert-${cert.uuid}`} value={cert.uuid} className="mt-0.5" />
                <span className="min-w-0">
                  <span className="block truncate font-mono text-xs text-ink">
                    {cert.serialNumber}
                  </span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {t('dashboard:documents.detail.sign.cert-validity', {
                      from: formatDate(cert.validFrom),
                      to: formatDate(cert.validTo),
                    })}
                  </span>
                </span>
              </Label>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="sign-pin">{t('dashboard:documents.detail.sign.pin-label')}</Label>
            <Input
              id="sign-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setPinError(false);
              }}
              className="w-40 font-mono tracking-widest"
            />
            {pinError ? (
              <p className="text-xs text-destructive">
                {t('dashboard:documents.detail.sign.pin-invalid')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('dashboard:documents.detail.sign.pin-hint')}
              </p>
            )}
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}
