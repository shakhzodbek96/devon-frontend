import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, TriangleAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatDateTime } from '@/i18n/uz-locale';
import { useExceptionStore } from '@/stores/useExceptionStore';

/**
 * Global "unhandled backend exception" surface — mounted once in `App.tsx`,
 * driven by `useExceptionStore`. `apiFetch` reports here for anything that
 * isn't one of the app's intentional `{code, message}` business errors, so
 * a real bug is never silently swallowed into a vague "unknown error" toast.
 */
export default function ExceptionModal() {
  const { t } = useTranslation(['common']);
  const current = useExceptionStore((s) => s.current);
  const clear = useExceptionStore((s) => s.clear);
  const [copied, setCopied] = useState(false);

  async function copyDetails() {
    if (!current) return;
    const text = JSON.stringify(current, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable/denied — the JSON is still visible to select manually.
    }
  }

  return (
    <Dialog open={!!current} onOpenChange={(next) => { if (!next) clear(); }}>
      <DialogContent className="min-w-0 max-w-2xl">
        <DialogHeader>
          <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0">
            <TriangleAlert className="h-5 w-5" />
          </div>
          <DialogTitle>{t('common:exceptionModal.title')}</DialogTitle>
          <DialogDescription>{t('common:exceptionModal.subtitle')}</DialogDescription>
        </DialogHeader>

        {current && (
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="destructive">HTTP {current.status}</Badge>
              <Badge variant="outline" className="max-w-full break-all font-mono">
                {current.method} {current.path}
              </Badge>
              <span className="text-muted-foreground">{formatDateTime(current.occurredAt)}</span>
            </div>

            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">
                {t('common:exceptionModal.message')}
              </p>
              <p className="break-words rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink">
                {current.message}
              </p>
            </div>

            {current.exception && (
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  {t('common:exceptionModal.exception-class')}
                </p>
                <p className="break-all rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-ink">
                  {current.exception}
                  {current.file && (
                    <span className="block text-muted-foreground">
                      {current.file}
                      {current.line !== undefined ? `:${current.line}` : ''}
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">
                {t('common:exceptionModal.raw')}
              </p>
              <pre className="max-h-64 max-w-full overflow-auto rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[11px] leading-relaxed text-ink">
                {JSON.stringify(current.raw, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => void copyDetails()}>
            {copied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copied ? t('common:exceptionModal.copied') : t('common:exceptionModal.copy')}
          </Button>
          <Button onClick={clear}>{t('common:actions.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
