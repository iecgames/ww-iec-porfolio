import type { Metadata } from 'next'

import configPromise from '@payload-config'
import {
  IconArrowLeft,
  IconBrandLinkedin,
  IconBriefcase,
  IconCalendarClock,
  IconCash,
  IconClock,
  IconMapPin,
  IconStack2,
} from '@tabler/icons-react'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'

import { SendUsCVBlock } from '@/blocks/SendUsCV/Component'
import { JobApplyModal } from '@/components/JobApplyModal'
import { JobCard, type JobCardData } from '@/components/JobCard'
import { Reveal, RevealGroup, RevealItem } from '@/components/Reveal'
import RichText from '@/components/RichText'
import { ShareButtonOutline } from '@/components/ShareWidget/ShareButtonOutline'
import { Button } from '@/components/ui/button'
import { cn } from '@/utilities/ui'

const SECTION_ACCENTS: Record<
  string,
  { gradient: string; glow: string; icon: string; iconRing: string; bullet: string }
> = {
  jobDescription: {
    gradient: 'from-blue-500 via-indigo-500 to-sky-500',
    glow: 'bg-blue-400/30',
    icon: 'bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/40',
    iconRing: 'ring-blue-100',
    bullet: 'bg-blue-500',
  },
  qualifications: {
    gradient: 'from-violet-500 via-fuchsia-500 to-pink-500',
    glow: 'bg-violet-400/30',
    icon: 'bg-linear-to-br from-violet-500 to-fuchsia-600 text-white shadow-violet-500/40',
    iconRing: 'ring-violet-100',
    bullet: 'bg-violet-500',
  },
  benefits: {
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    glow: 'bg-emerald-400/30',
    icon: 'bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/40',
    iconRing: 'ring-emerald-100',
    bullet: 'bg-emerald-500',
  },
}

import type { Job, Page } from '@/payload-types'

export const dynamic = 'force-static'
export const revalidate = 600

type Args = {
  params: Promise<{
    jobId: string
    locale: string
  }>
}

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'jobs',
    limit: 1000,
    pagination: false,
    overrideAccess: false,
  })
  return docs.map((doc) => ({ jobId: String(doc.id) }))
}

export default async function JobDetailPage({ params: paramsPromise }: Args) {
  const { jobId, locale } = await paramsPromise
  const job = await queryJobById({ id: jobId, locale })

  if (!job) notFound()

  const t = await getTranslations('JobDetail')

  const employmentTypeLabel = job.employmentType ? t(`type.${job.employmentType}` as const) : null

  // Extract admin-pinned related jobs (depth=1 populates them as Job objects)
  const rawRelated = job.relatedJobs
  const pinnedRelatedJobs: RelatedJobItem[] | null =
    Array.isArray(rawRelated) && rawRelated.length > 0
      ? (rawRelated as (string | Job)[])
          .filter((r): r is Job => typeof r === 'object' && r !== null)
          .slice(0, 3)
          .map((r) => ({
            id: String((r as Job).id),
            title: (r as Job).title,
            department: (r as Job).department,
            location: (r as Job).location,
            salaryLabel: (r as Job).salaryLabel ?? null,
            linkedinUrl: (r as Job).linkedinUrl ?? null,
          }))
      : null

  return (
    <article className="pt-24 pb-16">
      <div className="container">
        <Reveal direction="up" distance={12} duration={0.4} margin="0px" className="mb-6">
          <Link
            href="/career"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors"
          >
            <IconArrowLeft size={16} />
            {t('backToCareers')}
          </Link>
        </Reveal>

        <RevealGroup as="header" className="border-b border-gray-200 pb-8 mb-10" delayStart={0.05}>
          <RevealItem className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
              <IconStack2 size={14} />
              {job.department}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
              <IconMapPin size={14} />
              {job.location}
            </span>
            {employmentTypeLabel && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                <IconBriefcase size={14} />
                {employmentTypeLabel}
              </span>
            )}
          </RevealItem>
          <RevealItem>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-gray-900">
              {job.title}
            </h1>
          </RevealItem>
          {job.description && (
            <RevealItem>
              <p className="mt-4 text-gray-600 max-w-3xl leading-relaxed">{job.description}</p>
            </RevealItem>
          )}
        </RevealGroup>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12 items-start">
          <main className="min-w-0">
            <Reveal direction="up" distance={28} duration={0.6} once={false}>
              <Section
                variant="jobDescription"
                title={t('jobDescription')}
                data={job.jobDescription}
              />
            </Reveal>
            <Reveal direction="up" distance={28} duration={0.6} delay={0.05} once={false}>
              <Section
                variant="qualifications"
                title={t('qualifications')}
                data={job.qualifications}
              />
            </Reveal>
            <Reveal direction="up" distance={28} duration={0.6} delay={0.1} once={false}>
              <Section variant="benefits" title={t('benefits')} data={job.benefits} last />
            </Reveal>
          </main>

          <Reveal
            as="aside"
            direction="left"
            distance={32}
            delay={0.2}
            once={false}
            className="lg:sticky lg:top-24"
          >
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-5">
                {t('jobSummary')}
              </h2>
              <dl className="space-y-4 mb-6">
                {job.salaryLabel && (
                  <SummaryRow
                    icon={<IconCash size={18} />}
                    label={t('salary')}
                    value={job.salaryLabel}
                    valueClass="text-blue-600 font-semibold"
                  />
                )}
                <SummaryRow
                  icon={<IconMapPin size={18} />}
                  label={t('location')}
                  value={job.location}
                />
                <SummaryRow
                  icon={<IconStack2 size={18} />}
                  label={t('department')}
                  value={job.department}
                />
                {job.workingHours && (
                  <SummaryRow
                    icon={<IconClock size={18} />}
                    label={t('workingHours')}
                    value={job.workingHours}
                  />
                )}
                {employmentTypeLabel && (
                  <SummaryRow
                    icon={<IconCalendarClock size={18} />}
                    label={t('employmentType')}
                    value={employmentTypeLabel}
                  />
                )}
              </dl>

              <div className="space-y-3">
                <JobApplyModal
                  className="w-full"
                  jobId={String(job.id)}
                  jobTitle={job.title}
                  labels={{
                    triggerLabel: t('applyNow'),
                    title: t('apply.title'),
                    subtitle: t('apply.subtitle'),
                    fullName: t('apply.fullName'),
                    email: t('apply.email'),
                    phone: t('apply.phone'),
                    position: t('apply.position'),
                    experience: t('apply.experience'),
                    additionalLink: t('apply.additionalLink'),
                    additionalLinkPlaceholder: t('apply.additionalLinkPlaceholder'),
                    additionalLinkHint: t('apply.additionalLinkHint'),
                    cv: t('apply.cv'),
                    cvHint: t('apply.cvHint'),
                    cvAttached: t('apply.cvAttached'),
                    cvChange: t('apply.cvChange'),
                    submit: t('apply.submit'),
                    submitting: t('apply.submitting'),
                    successTitle: t('apply.successTitle'),
                    successBody: t('apply.successBody'),
                    close: t('apply.close'),
                    required: t('apply.required'),
                  }}
                />
                {job.linkedinUrl && (
                  <Button asChild className="w-full" size="lg" variant="outline">
                    <a href={job.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      <IconBrandLinkedin size={18} />
                      {t('viewLinkedIn')}
                    </a>
                  </Button>
                )}
                <ShareButtonOutline label={t('shareJob')} shareText={job.title} />
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <RelatedJobsSection
        currentJobId={jobId}
        department={job.department}
        locale={locale}
        pinnedJobs={pinnedRelatedJobs}
      />

      <Reveal direction="up" distance={32} duration={0.7} className="mt-20">
        <CareerSendUsCVSection />
      </Reveal>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { jobId, locale } = await paramsPromise
  const job = await queryJobById({ id: jobId, locale })
  if (!job) return {}

  const description = job.description ?? `${job.department} · ${job.location}`
  return {
    title: job.title,
    description,
    openGraph: {
      title: job.title,
      description,
    },
  }
}

const queryJobById = cache(
  async ({ id, locale }: { id: string; locale: string }): Promise<Job | null> => {
    if (!/^[a-f0-9]{24}$/i.test(id)) return null
    const payload = await getPayload({ config: configPromise })
    try {
      const job = await payload.findByID({
        collection: 'jobs',
        id,
        depth: 1,
        overrideAccess: false,
        locale: locale as 'en' | 'vi',
      })
      return job ?? null
    } catch {
      return null
    }
  },
)

function SummaryRow({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-gray-400 shrink-0">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
        <dd className={cn('text-sm text-gray-900 mt-0.5', valueClass)}>{value}</dd>
      </div>
    </div>
  )
}

type RichTextData = NonNullable<Job['jobDescription']>

function Section({
  variant,
  title,
  data,
  last,
}: {
  variant: 'jobDescription' | 'qualifications' | 'benefits'
  title: string
  data?: RichTextData | null
  last?: boolean
}) {
  if (!data) return null
  const accent = SECTION_ACCENTS[variant]
  return (
    <section
      className={cn(
        'group relative overflow-hidden rounded-3xl bg-white',
        'border border-gray-200/70 shadow-none',
        'transition-[transform,box-shadow,border-color] duration-300 ease-out',
        'hover:-translate-y-1 hover:border-gray-200 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06),0_24px_48px_-16px_rgba(15,23,42,0.18)]',
        last ? '' : 'mb-6',
      )}
    >
      {/* Gradient accent strip at the top — fades in on hover */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-x-0 top-0 h-1 bg-linear-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          accent.gradient,
        )}
      />
      {/* Soft colored glow in the corner — only on hover */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl opacity-0',
          'transition-opacity duration-500 group-hover:opacity-80',
          accent.glow,
        )}
      />

      <div className="relative px-7 sm:px-10 pt-9 sm:pt-11 pb-8 sm:pb-10">
        <div className="flex items-center gap-4 mb-7">
          <span
            aria-hidden
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center rounded-2xl ring-4 ring-white text-sm font-bold shadow-lg',
              accent.icon,
            )}
          >
            {variant === 'jobDescription' ? 'JD' : variant === 'qualifications' ? 'Q' : '★'}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-gray-900 leading-tight">
              {title}
            </h2>
            <span
              aria-hidden
              className={cn(
                'mt-2 inline-block h-0.5 w-10 rounded-full bg-linear-to-r',
                accent.gradient,
              )}
            />
          </div>
        </div>

        <RichText
          data={data}
          enableGutter={false}
          className={cn(
            'max-w-none prose prose-gray prose-base sm:prose-lg leading-[1.75] text-gray-700',
            'prose-headings:text-gray-900 prose-headings:font-semibold prose-headings:tracking-tight',
            'prose-strong:text-gray-900 prose-a:text-blue-600 hover:prose-a:text-blue-700',
            'prose-li:my-1.5 prose-ul:my-3 prose-p:my-3',
            'marker:text-gray-400',
          )}
        />
      </div>
    </section>
  )
}

type RelatedJobItem = JobCardData

async function RelatedJobsSection({
  currentJobId,
  department,
  locale,
  pinnedJobs,
}: {
  currentJobId: string
  department: string
  locale: string
  pinnedJobs: RelatedJobItem[] | null
}) {
  const t = await getTranslations('JobDetail')

  let docs: RelatedJobItem[]

  if (pinnedJobs && pinnedJobs.length > 0) {
    docs = pinnedJobs
  } else {
    const payload = await getPayload({ config: configPromise })
    const result = await payload.find({
      collection: 'jobs',
      limit: 3,
      depth: 0,
      overrideAccess: false,
      locale: locale as 'en' | 'vi',
      where: {
        and: [{ department: { equals: department } }, { id: { not_equals: currentJobId } }],
      },
    })
    docs = result.docs.map((j) => ({
      id: String(j.id),
      title: j.title,
      department: j.department,
      location: j.location,
      salaryLabel: j.salaryLabel ?? null,
      linkedinUrl: j.linkedinUrl ?? null,
    }))
  }

  if (docs.length === 0) return null

  return (
    <div className="container mt-16">
      <Reveal direction="up" distance={24} duration={0.6}>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t('relatedJobs')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </Reveal>
    </div>
  )
}

async function CareerSendUsCVSection() {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'pages',
    limit: 1,
    pagination: false,
    depth: 2,
    where: { slug: { equals: 'career' } },
  })
  const careerPage = docs[0] as Page | undefined
  const block = careerPage?.layout?.find(
    (b): b is Extract<NonNullable<Page['layout']>[number], { blockType: 'sendUsCV' }> =>
      b?.blockType === 'sendUsCV',
  )
  if (!block) return null
  return <SendUsCVBlock {...block} id={block.id ?? undefined} />
}
