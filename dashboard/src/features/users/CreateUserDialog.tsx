import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createUser, type CreateUserResponse } from '@/lib/api/users';
import { ApiError } from '@/lib/api/client';
import type { Role } from '@/types/domain';
import type { RoleOption } from '@/lib/api/roles';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleOptions: RoleOption[];
  onCreated: (result: CreateUserResponse) => void;
}

export default function CreateUserDialog({ open, onOpenChange, roleOptions, onCreated }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [passwordMode, setPasswordMode] = useState<'auto' | 'manual'>('auto');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function reset() {
    setEmail('');
    setFullName('');
    setRoles([]);
    setPasswordMode('auto');
    setPassword('');
    setErrors({});
  }

  function toggleRole(code: Role, checked: boolean) {
    setRoles((prev) => (checked ? [...prev, code] : prev.filter((r) => r !== code)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});

    if (roles.length === 0) {
      setErrors({ roles: t('dashboard:users.create.roles-hint') });
      return;
    }

    setSubmitting(true);
    try {
      const result = await createUser({
        email: email.trim(),
        fullName: fullName.trim(),
        roles,
        password: passwordMode === 'manual' ? password : undefined,
      });
      onOpenChange(false);
      reset();
      onCreated(result);
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const next: Record<string, string> = {};
        if (err.errors.email) next.email = t('common:errors.email-taken');
        if (err.errors.fullName) next.fullName = t('common:errors.required');
        if (err.errors.roles) next.roles = t('dashboard:users.create.roles-hint');
        if (err.errors.password) next.password = t('dashboard:profile.password.errors.weak');
        setErrors(next);
      } else if (err instanceof ApiError && err.status === 0) {
        setErrors({ form: t('common:errors.network') });
      } else {
        setErrors({ form: t('common:errors.unknown') });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t('dashboard:users.create.dialog-title')}</DialogTitle>
            <DialogDescription>{t('dashboard:users.create.dialog-subtitle')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="new-user-email">{t('dashboard:users.create.email-label')}</Label>
            <Input
              id="new-user-email"
              type="email"
              autoComplete="off"
              placeholder={t('dashboard:users.create.email-placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-user-full-name">{t('dashboard:users.create.full-name-label')}</Label>
            <Input
              id="new-user-full-name"
              autoComplete="off"
              placeholder={t('dashboard:users.create.full-name-placeholder')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={submitting}
              required
            />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('dashboard:users.create.roles-label')}</Label>
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-line p-3 sm:grid-cols-2">
              {roleOptions.map((opt) => (
                <label
                  key={opt.code}
                  className="flex items-center gap-2 text-sm text-ink"
                  htmlFor={`role-${opt.code}`}
                >
                  <Checkbox
                    id={`role-${opt.code}`}
                    checked={roles.includes(opt.code)}
                    onCheckedChange={(v) => toggleRole(opt.code, !!v)}
                    disabled={submitting}
                  />
                  <span className="truncate">{t(`common:roles.${opt.code}`)}</span>
                </label>
              ))}
            </div>
            {errors.roles && <p className="text-xs text-destructive">{errors.roles}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('dashboard:users.create.password-mode-label')}</Label>
            <RadioGroup
              value={passwordMode}
              onValueChange={(v) => setPasswordMode(v as 'auto' | 'manual')}
              className="flex flex-col gap-2"
            >
              <label className="flex items-center gap-2 text-sm text-ink">
                <RadioGroupItem value="auto" disabled={submitting} />
                {t('dashboard:users.create.password-mode-auto')}
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <RadioGroupItem value="manual" disabled={submitting} />
                {t('dashboard:users.create.password-mode-manual')}
              </label>
            </RadioGroup>
            {passwordMode === 'manual' && (
              <div className="pt-1">
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('dashboard:users.create.password-placeholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
                {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
              </div>
            )}
          </div>

          {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t('dashboard:users.create.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {t('dashboard:users.create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
