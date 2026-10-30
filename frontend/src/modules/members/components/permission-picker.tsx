import { PERMISSIONS } from '@shigjetademy/shared/auth'
import type { Permission } from '@shigjetademy/shared/auth'
import { PERMISSION_GROUPS } from '../utils/permission-labels'

interface PermissionPickerProps {
  value: Permission[]
  onChange: (permissions: Permission[]) => void
  error?: string
}

/** Checkboxes for what a School Admin may do, in groups, with one switch for all of them */
export function PermissionPicker({ value, onChange, error }: PermissionPickerProps) {
  const isAllSelected = value.length === PERMISSIONS.length

  const handleToggle = (permission: Permission) => {
    onChange(value.includes(permission) ? value.filter((item) => item !== permission) : [...value, permission])
  }

  const handleToggleAll = () => {
    onChange(isAllSelected ? [] : [...PERMISSIONS])
  }

  return (
    <fieldset className="grid min-w-0 gap-4" aria-describedby={error ? 'permission-picker-error' : undefined}>
      <div className="flex items-baseline justify-between gap-3">
        <legend className="text-[0.987rem] font-[650]">What can they manage?</legend>
        <button type="button" className="text-[0.93rem] font-semibold text-green-deep hover:underline" onClick={handleToggleAll}>
          {isAllSelected ? 'Clear all' : 'Select all'}
        </button>
      </div>

      {PERMISSION_GROUPS.map((group) => (
        <div key={group.title} className="grid gap-2">
          <p className="font-data text-[0.78rem] tracking-[0.06em] text-ink-3 uppercase">{group.title}</p>
          <div className="grid grid-cols-2 gap-2 max-[560px]:grid-cols-1">
            {group.permissions.map((permission) => (
              <label
                key={permission.value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-rule-strong bg-white px-3.5 py-3 transition-[border-color,background-color] duration-150 hover:border-ink-3 has-checked:border-green-deep has-checked:bg-green-wash/40 has-focus-visible:shadow-[0_0_0_3px_var(--green-wash)]"
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4 flex-none accent-green-deep"
                  checked={value.includes(permission.value)}
                  onChange={() => handleToggle(permission.value)}
                />
                <span className="grid leading-snug">
                  <span className="font-semibold">{permission.label}</span>
                  <span className="text-[0.88rem] text-ink-3">{permission.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {error ? (
        <p id="permission-picker-error" className="text-[0.95rem] font-[550] text-coral-deep" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
