type FieldPropsParams = {
  id: string
  error: string | undefined
  isPending: boolean
}

/** What every input of a dialog form sets: its error state and that it waits while saving */
export const fieldProps = ({ id, error, isPending }: FieldPropsParams) => ({
  'aria-invalid': !!error,
  'aria-describedby': error ? `${id}-error` : undefined,
  disabled: isPending,
})
