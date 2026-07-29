import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  CheckCheck,
  Forward,
  Info,
  Loader2,
  Play,
  SendHorizontal,
  ShieldCheck,
  Upload,
  UserRoundPlus,
} from 'lucide-react';

import SignDialog from '@/features/_shared/eri/SignDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  acceptLetterExecution,
  signLetter,
  startLetterExecution,
  type LetterDetail,
} from '@/lib/data/letters';

import AssignDialog from './AssignDialog';
import DispatchDialog from './DispatchDialog';
import ExecuteDialog from './ExecuteDialog';
import RouteDialog from './RouteDialog';
import { toastLetterError } from './letterErrors';

/** Action visibility — computed in the page from the acting persona vs the letter. */
export interface LetterGate {
  canRoute: boolean;
  canAssign: boolean;
  canStart: boolean;
  canSubmit: boolean;
  canAccept: boolean;
  canSign: boolean;
  canDispatch: boolean;
}

export interface LetterHint {
  /** `dashboard:letters.detail.lane.*` key for whose turn it is. */
  laneKey: string;
  /** Optional concrete detail (executor FIO or routed unit name). */
  who?: string;
}

interface Props {
  detail: LetterDetail;
  /** Acting employee uuid — all mutations run as this persona. */
  actorUuid: string;
  gate: LetterGate;
  hint: LetterHint | null;
  isTerminal: boolean;
  /** Refetch the detail + its audit trail. */
  onChanged: () => void;
}

/**
 * One primary action per BP-3 state (the swim-lane's token). UI convenience
 * only — the step-20 policy layer re-validates every call, so a persona who
 * shouldn't see an action also can't perform it.
 */
export default function LetterActions({
  detail,
  actorUuid,
  gate,
  hint,
  isTerminal,
  onChanged,
}: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const letter = detail.letter;

  const [busy, setBusy] = useState<'start' | 'accept' | null>(null);
  const [routeOpen, setRouteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [executeOpen, setExecuteOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);

  async function start() {
    setBusy('start');
    try {
      await startLetterExecution(letter.uuid, actorUuid);
      toast.success(t('dashboard:letters.detail.toast.started'));
      onChanged();
    } catch (err) {
      toastLetterError(t, err);
    } finally {
      setBusy(null);
    }
  }

  async function confirmAccept() {
    setBusy('accept');
    try {
      await acceptLetterExecution(letter.uuid, actorUuid);
      toast.success(t('dashboard:letters.detail.toast.accepted'));
      setAcceptOpen(false);
      onChanged();
    } catch (err) {
      toastLetterError(t, err);
    } finally {
      setBusy(null);
    }
  }

  // Acceptance branch — the confirm body tells the unit head where it goes next.
  const hasResponse = Boolean(letter.responseFileMeta || letter.responseDocumentUuid);
  const acceptBodyKey = !hasResponse
    ? 'dashboard:letters.detail.accept.body-close'
    : letter.requiresSignature
      ? 'dashboard:letters.detail.accept.body-signature'
      : 'dashboard:letters.detail.accept.body-dispatch';

  const hasAction =
    gate.canRoute ||
    gate.canAssign ||
    gate.canStart ||
    gate.canSubmit ||
    gate.canAccept ||
    gate.canSign ||
    gate.canDispatch;

  if (!hasAction) {
    if (isTerminal) {
      return (
        <p className="text-sm text-muted-foreground">
          {t('dashboard:letters.detail.closed-line')}
        </p>
      );
    }
    if (hint) {
      const lane = t(hint.laneKey);
      return (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" aria-hidden />
          {hint.who
            ? `${t('dashboard:letters.detail.turn-hint', { lane })}: ${hint.who}`
            : t('dashboard:letters.detail.turn-hint', { lane })}
        </p>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {gate.canRoute && (
          <Button onClick={() => setRouteOpen(true)} className="w-full sm:w-auto">
            <Forward className="mr-2 h-4 w-4" />
            {t('dashboard:letters.detail.actions.route')}
          </Button>
        )}
        {gate.canAssign && (
          <Button onClick={() => setAssignOpen(true)} className="w-full sm:w-auto">
            <UserRoundPlus className="mr-2 h-4 w-4" />
            {t('dashboard:letters.detail.actions.assign')}
          </Button>
        )}
        {gate.canStart && (
          <Button onClick={start} disabled={busy !== null} className="w-full sm:w-auto">
            {busy === 'start' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {t('dashboard:letters.detail.actions.start')}
          </Button>
        )}
        {gate.canSubmit && (
          <Button
            variant={gate.canStart ? 'outline' : 'default'}
            onClick={() => setExecuteOpen(true)}
            disabled={busy !== null}
            className="w-full sm:w-auto"
          >
            <Upload className="mr-2 h-4 w-4" />
            {t('dashboard:letters.detail.actions.submit')}
          </Button>
        )}
        {gate.canAccept && (
          <Button
            onClick={() => setAcceptOpen(true)}
            disabled={busy !== null}
            className="w-full sm:w-auto"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            {t('dashboard:letters.detail.actions.accept')}
          </Button>
        )}
        {gate.canSign && (
          <Button onClick={() => setSignOpen(true)} className="w-full sm:w-auto">
            <ShieldCheck className="mr-2 h-4 w-4" />
            {t('dashboard:letters.detail.actions.sign')}
          </Button>
        )}
        {gate.canDispatch && (
          <Button onClick={() => setDispatchOpen(true)} className="w-full sm:w-auto">
            <SendHorizontal className="mr-2 h-4 w-4" />
            {t('dashboard:letters.detail.actions.dispatch')}
          </Button>
        )}
      </div>

      <RouteDialog
        open={routeOpen}
        onOpenChange={setRouteOpen}
        letterUuid={letter.uuid}
        actorUuid={actorUuid}
        onDone={onChanged}
      />
      {letter.routedToUnitUuid && (
        <AssignDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          letterUuid={letter.uuid}
          routedUnitUuid={letter.routedToUnitUuid}
          actorUuid={actorUuid}
          onDone={onChanged}
        />
      )}
      <ExecuteDialog
        open={executeOpen}
        onOpenChange={setExecuteOpen}
        letterUuid={letter.uuid}
        actorUuid={actorUuid}
        onDone={onChanged}
      />
      <SignDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        resourceUuid={letter.uuid}
        actorUuid={actorUuid}
        onDone={onChanged}
        onSign={(certificateUuid, signatureHex) =>
          signLetter(letter.uuid, actorUuid, certificateUuid, signatureHex)
        }
        errorNamespace="letters"
        successKey="dashboard:letters.detail.sign.success"
      />
      <DispatchDialog
        open={dispatchOpen}
        onOpenChange={setDispatchOpen}
        letter={letter}
        actorUuid={actorUuid}
        onDone={onChanged}
      />

      <AlertDialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard:letters.detail.accept.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t(acceptBodyKey)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>
              {t('common:actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmAccept();
              }}
              disabled={busy !== null}
            >
              {t('dashboard:letters.detail.actions.accept')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
