import { useState } from 'react'
import { MessageSquareText, Plus } from 'lucide-react'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { useParentNoteConversations } from '../hooks/use-parent-note-conversations'
import { useParentNoteGroups } from '../hooks/use-parent-note-groups'
import { ParentNoteConversationList } from './parent-note-conversation-list'
import { ParentNoteWorkspace } from './parent-note-workspace'

interface ParentNotesPageProps {
  organizationId: string
}

/** A lecturer's notes to the guardians of their students: conversations on the left, groups, students and the note on the right */
export function ParentNotesPage({ organizationId }: ParentNotesPageProps) {
  const groups = useParentNoteGroups(organizationId)
  const conversations = useParentNoteConversations(organizationId)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [pickedGroupId, setPickedGroupId] = useState('')

  // A group that is no longer taught falls back to none, instead of a select showing a value it has no option for
  const groupId = groups.data?.some((group) => group.id === pickedGroupId) ? pickedGroupId : ''

  const handleSelectConversation = (nextStudentId: string) => {
    setStudentId(nextStudentId)
    const group = groups.data?.find((item) => item.students.some((student) => student.id === nextStudentId))
    if (group) setPickedGroupId(group.id)
  }

  const handleSelectGroup = (nextGroupId: string) => {
    setPickedGroupId(nextGroupId)
    setStudentId(null)
  }

  const handleBack = () => setStudentId(null)

  const handleNewNote = () => {
    setStudentId(null)
    setPickedGroupId('')
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={MessageSquareText} title="Student notes" subtitle="Write to a student’s parents or guardians and keep every note in one place.">
        <button type="button" className="button button--primary min-h-11 px-5 text-base" onClick={handleNewNote}>
          <Plus size={17} strokeWidth={2.2} aria-hidden="true" />
          New Note
        </button>
      </DashboardPageHeader>

      <div className="grid min-w-0 items-start gap-5 px-[clamp(20px,3.4vw,44px)] pb-10 min-[1000px]:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <ParentNoteConversationList conversations={conversations} selectedStudentId={studentId} onSelect={handleSelectConversation} />
        <ParentNoteWorkspace
          organizationId={organizationId}
          groups={groups}
          groupId={groupId}
          studentId={studentId}
          onSelectGroup={handleSelectGroup}
          onSelectStudent={setStudentId}
          onBack={handleBack}
        />
      </div>
    </div>
  )
}
