import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
import {
  createPosition,
  updatePosition,
  PositionValidationError,
} from '@/lib/data/positions';
import type { Position, UnitType } from '@/types/domain';

const UNIT_TYPES: UnitType[] = [
  'DEPARTMENT',
  'DIRECTORATE',
  'DIVISION',
  'DEPARTMENT_SUB',
  'SECTION',
  'OTHER',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = create mode; a position = edit mode. */
  position: Position | null;
  onSaved: () => void;
}

export default function PositionFormDialog({ open, onOpenChange, position, onSaved }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const isEdit = position !== null;

  const [nameUz, setNameUz] = useState('');
  const [types, setTypes] = useState<UnitType[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Re-seed the form each time the dialog opens (or the target changes).
  // Same "sync props into local form state on open" shape used across this
  // codebase's dialogs; react-hooks/set-state-in-effect flags it repo-wide.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNameUz(position?.nameUz ?? '');
    setTypes(position?.allowedUnitTypes ?? []);
    setErrors({});
  }, [open, position]);

  function toggleType(type: UnitType, checked: boolean) {
    setTypes((prev) => (checked ? [...prev, type] : prev.filter((x) => x !== type)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (nameUz.trim().length < 2) nextErrors.nameUz = t('dashboard:positions.errors.name-required');
    if (types.length === 0) nextErrors.types = t('dashboard:positions.errors.types-required');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (isEdit) {
        await updatePosition(position.id, { nameUz: nameUz.trim(), allowedUnitTypes: types });
        toast.success(t('dashboard:positions.toast.updated'));
      } else {
        await createPosition({ nameUz: nameUz.trim(), allowedUnitTypes: types });
        toast.success(t('dashboard:positions.toast.created'));
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      if (err instanceof PositionValidationError && err.code === 'duplicate-name') {
        setErrors({ nameUz: t('dashboard:positions.errors.duplicate-name') });
      } else {
        toast.error(t('common:errors.unknown'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t('dashboard:positions.edit-title') : t('dashboard:positions.create-title')}
            </DialogTitle>
            <DialogDescription>{t('dashboard:positions.form-hint')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="position-name">{t('dashboard:positions.field-name')}</Label>
              <Input
                id="position-name"
                value={nameUz}
                onChange={(e) => setNameUz(e.target.value)}
                placeholder={t('dashboard:positions.field-name-placeholder')}
                autoFocus
              />
              {errors.nameUz && <p className="text-sm text-destructive">{errors.nameUz}</p>}
            </div>

            <div className="space-y-2">
              <Label>{t('dashboard:positions.field-unit-types')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('dashboard:positions.field-unit-types-hint')}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {UNIT_TYPES.map((type) => (
                  <label
                    key={type}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-3 py-2 text-sm hover:bg-surface-2"
                  >
                    <Checkbox
                      checked={types.includes(type)}
                      onCheckedChange={(c) => toggleType(type, c === true)}
                    />
                    <span>{t(`common:unit-types.${type}`)}</span>
                  </label>
                ))}
              </div>
              {errors.types && <p className="text-sm text-destructive">{errors.types}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? t('common:actions.save') : t('dashboard:positions.create-submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
