import { showErrorToast } from '#/lib/error-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ClientOrganization, ClientOrganizationDetail } from '@shigjetademy/shared/organization'
import { organizationApi } from '../api/organization-api'
import { CLIENTS_QUERY_KEY } from './use-clients'
import { clientQueryKey } from './use-client'

// The new status is written into the cached client and the clients list, so both chips update without a refetch
export function useUpdateClientStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: organizationApi.updateStatus,
    onError: (error) => showErrorToast(error),
    onSuccess: ({ id, status }) => {
      queryClient.setQueryData<ClientOrganizationDetail>(clientQueryKey(id), (client) => (client ? { ...client, status } : client))
      queryClient.setQueryData<ClientOrganization[]>(CLIENTS_QUERY_KEY, (clients) =>
        clients?.map((client) => (client.id === id ? { ...client, status } : client)),
      )
    },
  })
}
