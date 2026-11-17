/** Which stored file to download: an assignment's own file, or a student's hand-in file */
export type AssignmentFileTarget = { kind: 'assignment'; assignmentId: string } | { kind: 'hand-in'; assignmentId: string; submissionId: string }
