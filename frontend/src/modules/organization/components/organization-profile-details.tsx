import type { OrganizationProfile } from '@shigjetademy/shared/organization'
import { SectionCard } from '#/components/SectionCard'
import { currencyNames, regionNames } from '../utils/format'
import { ORGANIZATION_TYPE_LABELS } from '../utils/labels'

interface OrganizationProfileDetailsProps {
  profile: OrganizationProfile
}

/** The profile as text, for school admins who may read but not change it */
export function OrganizationProfileDetails({ profile }: OrganizationProfileDetailsProps) {
  const details = [
    { label: 'Organization name', value: profile.name },
    { label: 'Type', value: ORGANIZATION_TYPE_LABELS[profile.type] },
    { label: 'Country', value: regionNames.of(profile.country) ?? profile.country },
    { label: 'Currency', value: `${profile.currency} · ${currencyNames.of(profile.currency) ?? ''}` },
    { label: 'Students', value: profile.size },
    { label: 'Email', value: profile.email },
    { label: 'Phone', value: profile.phone },
    { label: 'Website', value: profile.website },
  ]

  return (
    <SectionCard title="Details">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 px-5 py-5 max-[640px]:grid-cols-1">
        {details.map((detail) => (
          <div key={detail.label} className="grid min-w-0 gap-1">
            <dt className="text-[0.93rem] text-ink-3">{detail.label}</dt>
            <dd className="break-words">{detail.value ?? <span className="text-ink-3">Not added</span>}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  )
}
