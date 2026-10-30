import { toast } from 'react-hot-toast'
import { getErrorMessage } from './error-message'

export function showErrorToast(error: unknown) {
  toast.error(getErrorMessage(error))
}
