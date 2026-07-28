import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ApiError } from '@/lib/api/client';
import { updateUser } from '@/lib/api/users';
import type { ApiSessionUser } from '@/lib/api/auth';
import type { RoleOption } from '@/lib/api/roles';
import type { Role } from '@/types/domain';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ApiSessionUser | null;
  roleOptions: RoleOption[];
  onUpdated: (user: ApiSessionUser) => void;
}

export default function EditUserDialog({ open, onOpenChange, user, roleOptions, onUpdated }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  // Initialized from `user` once per mount — the parent remounts this
  // component (via `key={editUser?.uuid}`) whenever the target user
  // changes, so this never needs to resync via an effect.
  const [roles, setRoles] = useState<Role[]>(() => user?.roles ?? []);
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED'>(() => user?.status ?? 'ACTIVE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleRole(code: Role, checked: boolean) {
    setRoles((prev) => (checked ? [...prev, code] : prev.filter((r) => r !== code)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (roles.length === 0) {
      setError(t('dashboard:users.create.roles-hint'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateUser(user.uuid, { roles, status });
      onOpenChange(false);
      onUpdated(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setError(t('common:errors.network'));
      } else {
        setError(t('common:errors.unknown'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t('dashboard:users.edit.dialog-title')}</DialogTitle>
          </DialogHeader>

          {user && (
            <p className="text-sm text-muted-foreground">
              {user.fullName} · {user.email}
            </p>
          )}

          <div className="space-y-2">
            <Label>{t('dashboard:users.edit.roles-label')}</Label>
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-line p-3 sm:grid-cols-2">
              {roleOptions.map((opt) => (
                <label
                  key={opt.code}
                  className="flex items-center gap-2 text-sm text-ink"
                  htmlFor={`edit-role-${opt.code}`}
                >
                  <Checkbox
                    id={`edit-role-${opt.code}`}
                    checked={roles.includes(opt.code)}
                    onCheckedChange={(v) => toggleRole(opt.code, !!v)}
                    disabled={submitting}
                  />
                  <span className="truncate">{t(`common:roles.${opt.code}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('dashboard:users.edit.status-label')}</Label>
            <RadioGroup
              value={status}
              onValueChange={(v) => setStatus(v as 'ACTIVE' | 'SUSPENDED')}
              className="flex flex-col gap-2"
            >
              <label className="flex items-center gap-2 text-sm text-ink">
                <RadioGroupItem value="ACTIVE" disabled={submitting} />
                {t('dashboard:users.edit.status-active')}
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <RadioGroupItem value="SUSPENDED" disabled={submitting} />
                {t('dashboard:users.edit.status-suspended')}
              </label>
            </RadioGroup>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t('dashboard:users.create.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {t('dashboard:users.edit.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
