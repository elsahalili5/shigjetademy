import type { RefObject } from 'react'
import { Users } from 'lucide-react'
import type { AnnouncementAudienceOptions, AnnouncementDetail } from '@shigjetademy/shared/announcements'
import { EmptyMessage } from '#/components/EmptyMessage'
import { FormDialog } from '#/components/FormDialog'
import { LoadError } from '#/components/LoadError'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { useAnnouncementAudiences } from '../hooks/use-announcement-audiences'
import { useAnnouncementForm } from '../hooks/use-announcement-form'
import { useCreateAnnouncement } from '../hooks/use-create-announcement'
import { useUpdateAnnouncement } from '../hooks/use-update-announcement'
import { getAudienceLabel } from '../utils/audience-label'
import { toCreateInput, toFormValues, toUpdateInput } from '../utils/announcement-form'
import { AnnouncementFormFields } from './announcement-form-fields'

interface AnnouncementFormDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  /** The announcement to change; left out to write a new one */
  announcement?: AnnouncementDetail
  onSaved: (announcementId: string) => void
}

/** Write a new announcement or change one: title, message, who it is for and when it goes out */
export function AnnouncementFormDialog({ dialogRef, organizationId, announcement, onSaved }: AnnouncementFormDialogProps) {
  // Changing the audience needs the options; an announcement whose audience is locked doesn't
  const needsOptions = !announcement || announcement.can_change_audience
  const options = useAnnouncementAudiences({ organizationId, isEnabled: needsOptions })
  const handleClose = () => dialogRef.current?.close()

  const handleSaved = (announcementId: string) => {
    handleClose()
    onSaved(announcementId)
  }

  return (
    <FormDialog
      dialogRef={dialogRef}
      title={announcement ? 'Edit announcement' : 'New announcement'}
      subtitle={announcement ? 'Changes show to everyone it was sent to.' : 'An official notice for the people you choose. They can read it, not reply.'}
      onClose={handleClose}
    >
      {needsOptions && options.status === 'error' ? <LoadError what="audiences" onRetry={() => void options.refetch()} /> : null}
      {needsOptions && options.status === 'pending' ? <p className="px-6 py-8 text-ink-2">Loading…</p> : null}
      {needsOptions && options.data ? <AnnouncementFormBody organizationId={organizationId} announcement={announcement} options={options.data} onSaved={handleSaved} onCancel={handleClose} /> : null}
      {needsOptions ? null : <AnnouncementFormBody organizationId={organizationId} announcement={announcement} options={NO_OPTIONS} onSaved={handleSaved} onCancel={handleClose} />}
    </FormDialog>
  )
}

/** An announcement whose audience is locked offers no choices */
const NO_OPTIONS: AnnouncementAudienceOptions = { can_create: true, can_address_school: false, roles: [], courses: [], groups: [] }

interface AnnouncementFormBodyProps {
  organizationId: string
  announcement?: AnnouncementDetail
  options: AnnouncementAudienceOptions
  onSaved: (announcementId: string) => void
  onCancel: () => void
}

function AnnouncementFormBody({ organizationId, announcement, options, onSaved, onCancel }: AnnouncementFormBodyProps) {
  const isAudienceAvailable = options.can_address_school || options.groups.length > 0 || options.courses.length > 0 || options.roles.length > 0
  if (!announcement && !isAudienceAvailable) {
    return (
      <>
        <EmptyMessage icon={Users} title="There is nobody you can write to yet." text="Lecturers can write to the groups and courses they currently teach." />
        <footer className="flex justify-end border-t border-rule px-6 py-4">
          <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
            Close
          </button>
        </footer>
      </>
    )
  }
  return announcement ? (
    <EditAnnouncementForm organizationId={organizationId} announcement={announcement} options={options} onSaved={onSaved} onCancel={onCancel} />
  ) : (
    <NewAnnouncementForm organizationId={organizationId} options={options} onSaved={onSaved} onCancel={onCancel} />
  )
}

interface NewAnnouncementFormProps {
  organizationId: string
  options: AnnouncementAudienceOptions
  onSaved: (announcementId: string) => void
  onCancel: () => void
}

function NewAnnouncementForm({ organizationId, options, onSaved, onCancel }: NewAnnouncementFormProps) {
  const timeZone = useOrganizationTimeZone()
  const form = useAnnouncementForm({ defaultValues: toFormValues({ announcement: null, options, timeZone }), timeZone })
  const createAnnouncement = useCreateAnnouncement(organizationId)

  const handleSubmit = form.handleSubmit((values) =>
    createAnnouncement.mutate(toCreateInput({ values, timeZone }), {
      onSuccess: (saved) => {
        form.reset(toFormValues({ announcement: null, options, timeZone }))
        onSaved(saved.id)
      },
    }),
  )

  return (
    <AnnouncementFormFields
      form={form}
      options={options}
      lockedAudienceLabel={null}
      isPublishingLocked={false}
      isPending={createAnnouncement.isPending}
      error={createAnnouncement.error}
      timeZone={timeZone}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  )
}

interface EditAnnouncementFormProps {
  organizationId: string
  announcement: AnnouncementDetail
  options: AnnouncementAudienceOptions
  onSaved: (announcementId: string) => void
  onCancel: () => void
}

function EditAnnouncementForm({ organizationId, announcement, options, onSaved, onCancel }: EditAnnouncementFormProps) {
  const timeZone = useOrganizationTimeZone()
  const form = useAnnouncementForm({ defaultValues: toFormValues({ announcement, options, timeZone }), timeZone })
  const updateAnnouncement = useUpdateAnnouncement({ organizationId, announcementId: announcement.id })

  const handleSubmit = form.handleSubmit((values) =>
    updateAnnouncement.mutate(toUpdateInput({ values, timeZone, canChangePublishing: announcement.can_change_publishing }), {
      onSuccess: (saved) => {
        form.reset(toFormValues({ announcement: saved, options, timeZone }))
        onSaved(saved.id)
      },
    }),
  )

  return (
    <AnnouncementFormFields
      form={form}
      options={options}
      lockedAudienceLabel={announcement.can_change_audience ? null : getAudienceLabel(announcement)}
      isPublishingLocked={!announcement.can_change_publishing}
      isPending={updateAnnouncement.isPending}
      error={updateAnnouncement.error}
      timeZone={timeZone}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  )
}

/** The active organization's time zone, where scheduled times are read */
function useOrganizationTimeZone() {
  const membership = useActiveMembership()
  return membership?.organization.time_zone ?? 'UTC'
}
