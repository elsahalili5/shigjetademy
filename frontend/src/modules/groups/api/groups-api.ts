import { apiClient } from '#/api/client'
import type {
  Group,
  GroupEnrolment,
  GroupEnrolmentInput,
  GroupInput,
  GroupMoveInput,
  GroupLecturerHistory,
  GroupLecturerOption,
  GroupPage,
  GroupSubstitution,
  GroupStudentOption,
  GroupSubstitutionInput,
  LessonReschedule,
  LessonRescheduleInput,
  ListGroupsQuery,
} from '@shigjetademy/shared/groups'

type ListGroupsParams = ListGroupsQuery & {
  organizationId: string
}

type CreateGroupParams = GroupInput & {
  organizationId: string
}

type UpdateGroupParams = CreateGroupParams & {
  groupId: string
}

type GroupActionParams = {
  organizationId: string
  groupId: string
}

type AddSubstitutionParams = GroupActionParams & GroupSubstitutionInput

type SubstitutionActionParams = GroupActionParams & {
  substitutionId: string
}

type UpdateSubstitutionParams = SubstitutionActionParams & GroupSubstitutionInput

type EnrolStudentParams = GroupActionParams & GroupEnrolmentInput

type EnrolmentActionParams = GroupActionParams & {
  enrolmentId: string
}

type MoveStudentParams = EnrolmentActionParams & GroupMoveInput

type RescheduleLessonParams = GroupActionParams & LessonRescheduleInput

type RescheduleActionParams = GroupActionParams & {
  rescheduleId: string
}

const groupsPath = (organizationId: string) => `/organizations/${organizationId}/groups`

const enrolmentPath = ({ organizationId, groupId, enrolmentId }: EnrolmentActionParams) => `${groupsPath(organizationId)}/${groupId}/enrolments/${enrolmentId}`

const reschedulesPath = ({ organizationId, groupId }: GroupActionParams) => `${groupsPath(organizationId)}/${groupId}/reschedules`

const substitutionPath = ({ organizationId, groupId, substitutionId }: SubstitutionActionParams) => `${groupsPath(organizationId)}/${groupId}/substitutions/${substitutionId}`

export const groupsApi = {
  list: ({ organizationId, ...params }: ListGroupsParams) => apiClient.get<GroupPage>(groupsPath(organizationId), { params }),
  lecturerOptions: (organizationId: string) => apiClient.get<GroupLecturerOption[]>(`${groupsPath(organizationId)}/lecturer-options`),
  create: ({ organizationId, ...input }: CreateGroupParams) => apiClient.post<Group, GroupInput>(groupsPath(organizationId), input),
  get: ({ organizationId, groupId }: GroupActionParams) => apiClient.get<Group>(`${groupsPath(organizationId)}/${groupId}`),
  update: ({ organizationId, groupId, ...input }: UpdateGroupParams) => apiClient.put<Group, GroupInput>(`${groupsPath(organizationId)}/${groupId}`, input),
  studentOptions: (organizationId: string) => apiClient.get<GroupStudentOption[]>(`${groupsPath(organizationId)}/student-options`),
  enrolments: ({ organizationId, groupId }: GroupActionParams) => apiClient.get<GroupEnrolment[]>(`${groupsPath(organizationId)}/${groupId}/enrolments`),
  enrol: ({ organizationId, groupId, ...input }: EnrolStudentParams) => apiClient.post<GroupEnrolment, GroupEnrolmentInput>(`${groupsPath(organizationId)}/${groupId}/enrolments`, input),
  withdraw: (params: EnrolmentActionParams) => apiClient.post<GroupEnrolment>(`${enrolmentPath(params)}/withdraw`),
  move: ({ organizationId, groupId, enrolmentId, ...input }: MoveStudentParams) => apiClient.post<GroupEnrolment, GroupMoveInput>(`${enrolmentPath({ organizationId, groupId, enrolmentId })}/move`, input),
  lecturers: ({ organizationId, groupId }: GroupActionParams) => apiClient.get<GroupLecturerHistory>(`${groupsPath(organizationId)}/${groupId}/lecturers`),
  addSubstitution: ({ organizationId, groupId, ...input }: AddSubstitutionParams) => apiClient.post<GroupSubstitution, GroupSubstitutionInput>(`${groupsPath(organizationId)}/${groupId}/substitutions`, input),
  updateSubstitution: ({ organizationId, groupId, substitutionId, ...input }: UpdateSubstitutionParams) =>
    apiClient.put<GroupSubstitution, GroupSubstitutionInput>(substitutionPath({ organizationId, groupId, substitutionId }), input),
  cancelSubstitution: (params: SubstitutionActionParams) => apiClient.post<GroupSubstitution>(`${substitutionPath(params)}/cancel`),
  reschedules: (params: GroupActionParams) => apiClient.get<LessonReschedule[]>(reschedulesPath(params)),
  rescheduleLesson: ({ organizationId, groupId, ...input }: RescheduleLessonParams) => apiClient.post<LessonReschedule, LessonRescheduleInput>(reschedulesPath({ organizationId, groupId }), input),
  cancelReschedule: ({ rescheduleId, ...params }: RescheduleActionParams) => apiClient.post<LessonReschedule>(`${reschedulesPath(params)}/${rescheduleId}/cancel`),
  archive: ({ organizationId, groupId }: GroupActionParams) => apiClient.post<Group>(`${groupsPath(organizationId)}/${groupId}/archive`),
  restore: ({ organizationId, groupId }: GroupActionParams) => apiClient.post<Group>(`${groupsPath(organizationId)}/${groupId}/restore`),
}
