import { useRef, useState } from 'react'
import { Download, ExternalLink, FileText, Link2, StickyNote } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Material, MaterialFile, MaterialKind } from '@shigjetademy/shared/materials'
import { ChatBubbleMenu } from '#/components/ChatBubbleMenu'
import { ConfirmGroup } from '#/components/ConfirmGroup'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage } from '#/lib/error-message'
import { formatFileSize } from '#/lib/file-size'
import { fullName } from '#/lib/full-name'
import { saveFile } from '#/lib/save-file'
import { useFormatDate } from '#/lib/use-format-date'
import { useDownloadMaterial } from '../hooks/use-download-material'
import { useRemoveMaterial } from '../hooks/use-remove-material'
import { MaterialEditDialog } from './material-edit-dialog'

const KIND_ICONS: Record<MaterialKind, LucideIcon> = { FILE: FileText, LINK: Link2, NOTE: StickyNote }

interface MaterialContentProps {
  organizationId: string
  material: Material
}

interface MaterialItemProps extends MaterialContentProps {
  /** The sections already used in the space, offered when editing */
  sectionNames: string[]
}

/** One material: its kind, title, description, the file, link or note itself, who shared it when, and edit and remove where the member may */
export function MaterialItem({ organizationId, material, sectionNames }: MaterialItemProps) {
  const formatDate = useFormatDate()
  const removeMaterial = useRemoveMaterial({ organizationId, material })
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)
  const editDialogRef = useRef<HTMLDialogElement>(null)
  const Icon = KIND_ICONS[material.kind]
  const canAct = material.can_edit || material.can_remove

  const handleRemove = () => removeMaterial.mutate(undefined, { onSettled: () => setIsConfirmingRemove(false) })

  return (
    <li className="group/row flex gap-4 border-b border-rule px-5 py-4 last:border-b-0">
      <span className="grid size-10 flex-none place-items-center rounded-xl bg-green-wash text-green-deep" aria-hidden="true">
        <Icon size={19} strokeWidth={1.8} />
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <h3 className="font-semibold break-words">{material.title}</h3>
        {material.description ? <p className="whitespace-pre-wrap break-words text-ink-2">{material.description}</p> : null}
        <MaterialContent organizationId={organizationId} material={material} />
        <p className="text-[0.9rem] text-ink-3">
          {fullName(material.author)} · <time dateTime={material.created_at}>{formatDate(material.created_at)}</time>
        </p>
        {isConfirmingRemove ? (
          <ConfirmGroup label={`Remove ${material.title}`} question={material.kind === 'FILE' ? 'Remove this material and its file?' : 'Remove this material?'} confirmLabel="Remove" onConfirm={handleRemove} onCancel={() => setIsConfirmingRemove(false)} />
        ) : null}
        {removeMaterial.isError ? <FormAlert>{getErrorMessage(removeMaterial.error)}</FormAlert> : null}
      </div>
      {canAct ? (
        <ChatBubbleMenu
          label={`Actions for ${material.title}`}
          editLabel="Edit material"
          removeLabel="Remove material"
          canEdit={material.can_edit}
          canRemove={material.can_remove}
          isMine
          onEdit={() => editDialogRef.current?.showModal()}
          onRemove={() => setIsConfirmingRemove(true)}
        />
      ) : null}
      {/* Keyed by its last change, so the form opens on what is saved now */}
      {material.can_edit ? <MaterialEditDialog key={material.updated_at} dialogRef={editDialogRef} organizationId={organizationId} material={material} sectionNames={sectionNames} /> : null}
    </li>
  )
}

/** What the material holds: a file to download, a link to open or the note's words */
function MaterialContent({ organizationId, material }: MaterialContentProps) {
  switch (material.kind) {
    case 'LINK':
      return material.url ? (
        <a className="inline-flex w-fit items-center gap-1.5 font-semibold text-green-deep" href={material.url} target="_blank" rel="noopener noreferrer">
          Open link
          <ExternalLink size={15} strokeWidth={2} aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : null
    case 'NOTE':
      return <p className="whitespace-pre-wrap break-words rounded-xl bg-mist px-3.5 py-3">{material.body}</p>
    case 'FILE':
      return material.file ? <MaterialFileDownload organizationId={organizationId} materialId={material.id} file={material.file} /> : null
    default: {
      const unknown: never = material.kind
      throw new Error(`Unknown material kind: ${String(unknown)}`)
    }
  }
}

interface MaterialFileDownloadProps {
  organizationId: string
  materialId: string
  file: MaterialFile
}

/** Fetches the file with the member's token, which a plain link can't send, and saves it under its uploaded name */
function MaterialFileDownload({ organizationId, materialId, file }: MaterialFileDownloadProps) {
  const downloadMaterial = useDownloadMaterial(organizationId)

  const handleDownload = () => downloadMaterial.mutate(materialId, { onSuccess: (blob) => saveFile({ blob, fileName: file.name }) })

  return (
    <div className="grid gap-2">
      <span className="flex flex-wrap items-center gap-2.5">
        <button type="button" className="button button--ghost min-h-9 px-3.5 text-[0.95rem]" aria-label={`Download ${file.name}`} disabled={downloadMaterial.isPending} onClick={handleDownload}>
          <Download size={16} strokeWidth={2} aria-hidden="true" />
          {downloadMaterial.isPending ? 'Downloading…' : 'Download'}
        </button>
        <span className="min-w-0 truncate text-[0.93rem] text-ink-2" title={file.name}>
          {file.name} · {formatFileSize(file.size)}
        </span>
      </span>
      {downloadMaterial.isError ? <FormAlert>{getErrorMessage(downloadMaterial.error)}</FormAlert> : null}
    </div>
  )
}
