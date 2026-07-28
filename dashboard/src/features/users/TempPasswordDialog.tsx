import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, KeyRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tempPassword: string | null;
}

/**
 * Shows a generated temporary password exactly once (PLAN_AUTH_ROLES.md
 * §2.5 — "javobdagi tempPassword ni bir marta modalda ko'rsat"). Used after
 * both `POST /users` (no explicit password) and `POST
 * /users/{uuid}/reset-password`. The backend never returns this value
 * again, so closing this dialog is the point of no return.
 */
export default function TempPasswordDialog({ open, onOpenChange, tempPassword }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable/denied — the password is still visible to select manually.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setCopied(false);
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-primary sm:mx-0">
            <KeyRound className="h-5 w-5" />
          </div>
          <DialogTitle>{t('dashboard:users.temp-password.title')}</DialogTitle>
          <DialogDescription>{t('dashboard:users.temp-password.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-4 py-3">
          <code className="select-all font-mono text-base tracking-wide text-ink">
            {tempPassword}
          </code>
          <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
            {copied ? (
              <Check className="h-4 w-4 text-success-fg" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="ml-1.5">
              {copied ? t('dashboard:users.temp-password.copied') : t('dashboard:users.temp-password.copy')}
            </span>
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t('dashboard:users.temp-password.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
