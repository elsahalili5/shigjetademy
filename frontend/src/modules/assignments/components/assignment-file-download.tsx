import { Download } from 'lucide-react'
import type { AssignmentFile } from '@shigjetademy/shared/assignments'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage } from '#/lib/error-message'
import { formatFileSize } from '#/lib/file-size'
import { saveFile } from '#/lib/save-file'
import { useDownloadAssignmentFile } from '../hooks/use-download-assignment-file'
import type { AssignmentFileTarget } from '../types'

interface AssignmentFileDownloadProps {
  organizationId: string
  target: AssignmentFileTarget
  file: AssignmentFile
}

/** Fetches the file with the member's token, which a plain link can't send, and saves it under its uploaded name */
export function AssignmentFileDownload({ organizationId, target, file }: AssignmentFileDownloadProps) {
  const downloadFile = useDownloadAssignmentFile({ organizationId, target })

  const handleDownload = () => downloadFile.mutate(undefined, { onSuccess: (blob) => saveFile({ blob, fileName: file.name }) })

  return (
    <div className="grid gap-2">
      <span className="flex flex-wrap items-center gap-2.5">
        <button type="button" className="button button--ghost min-h-9 px-3.5 text-[0.95rem]" aria-label={`Download ${file.name}`} disabled={downloadFile.isPending} onClick={handleDownload}>
          <Download size={16} strokeWidth={2} aria-hidden="true" />
          {downloadFile.isPending ? 'Downloading…' : 'Download'}
        </button>
        <span className="min-w-0 truncate text-[0.93rem] text-ink-2" title={file.name}>
          {file.name} · {formatFileSize(file.size)}
        </span>
      </span>
      {downloadFile.isError ? <FormAlert>{getErrorMessage(downloadFile.error)}</FormAlert> : null}
    </div>
  )
}
