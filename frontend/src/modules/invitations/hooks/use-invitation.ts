import { useQuery } from '@tanstack/react-query'
import { invitationsApi } from '../api/invitations-api'

/** What the invite link offers; an unusable link (unknown, expired, withdrawn) is an error with the server's reason */
export function useInvitation(token: string) {
  return useQuery({ queryKey: ['invitations', token], queryFn: () => invitationsApi.preview(token), retry: false })
}
