import type { Prisma } from '@generated/prisma/client.ts'

export type OrganizationScope = {
  tx: Prisma.TransactionClient
  organizationId: string
}

/** Locks the organization's row until the transaction ends, so writes that check its other rows first run one at a time */
export const lockOrganization = ({ tx, organizationId }: OrganizationScope) =>
  tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId}::uuid FOR UPDATE`
