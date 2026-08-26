import {
  IconArrowRight,
  IconBrandLinkedin,
  IconBriefcase,
  IconBrush,
  IconCode,
  IconMapPin,
  IconStack2,
} from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'

import { cn } from '@/utilities/ui'

export type JobCardData = {
  id: string
  title: string
  department: string
  location: string
  salaryLabel?: string | null
  linkedinUrl?: string | null
}

export function departmentIcon(dept: string) {
  if (!dept) return <IconBriefcase size={14} />
  const d = dept.toLowerCase()
  if (d.includes('engineer') || d.includes('dev') || d.includes('tech'))
    return <IconCode size={14} />
  if (d.includes('art') || d.includes('design') || d.includes('ui') || d.includes('ux'))
    return <IconBrush size={14} />
  if (d.includes('product') || d.includes('manage')) return <IconStack2 size={14} />
  return <IconBriefcase size={14} />
}

/**
 * Shared job card used across the JobBoard block and the related-jobs section.
 * Pure CSS hover flair (gradient wash, glow blobs, accent strip, lift) so it
 * works in both server and client components without framer-motion.
 */
export function JobCard({ job, className }: { job: JobCardData; className?: string }) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-4',
        'transition-[transform,box-shadow,border-color] duration-300 ease-out',
        'hover:-translate-y-1 hover:border-blue-300/70',
        'hover:shadow-[0_4px_12px_rgba(15,23,42,0.05),0_22px_44px_-20px_rgba(37,99,235,0.45)]',
        className,
      )}
    >
      {/* Soft gradient wash — fades in on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-br from-blue-50 via-white to-indigo-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      {/* Decorative glow blobs in the corners */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-blue-400/25 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -left-12 -bottom-12 h-28 w-28 rounded-full bg-indigo-400/20 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      {/* Accent strip that grows along the top edge on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-linear-to-r from-blue-500 via-indigo-500 to-sky-400 transition-transform duration-300 group-hover:scale-x-100"
      />

      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="mb-2 truncate text-base font-semibold text-gray-900 transition-colors group-hover:text-primary">
            <Link href={`/career/${job.id}`} className="transition-colors hover:text-primary">
              {job.title}
            </Link>
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              {departmentIcon(job.department)}
              {job.department}
            </span>
            <span className="flex items-center gap-1">
              <IconMapPin size={14} />
              {job.location}
            </span>
            {job.salaryLabel && (
              <span className="flex items-center gap-1 font-medium text-blue-600">
                <span className="inline-block w-3.5 h-3.5 text-center leading-none">💼</span>
                {job.salaryLabel}
              </span>
            )}
          </div>
        </div>

        <div className="relative flex shrink-0 items-center gap-2">
          {job.linkedinUrl && (
            <a
              href={job.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on LinkedIn"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white/70 text-gray-400 transition-colors hover:border-blue-300 hover:text-blue-600"
              onClick={(e) => e.stopPropagation()}
            >
              <IconBrandLinkedin size={16} />
            </a>
          )}
          <Link
            href={`/career/${job.id}`}
            aria-label="View job details"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-all duration-200 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-blue-500/30"
          >
            <IconArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
