import React from 'react'
import type { JobBoardBlock as JobBoardBlockProps } from '@/payload-types'
import { JobBoardClient, type JobItem } from './JobBoardClient'
import { getCachedJobBoardJobs } from './query'

export const JobBoardBlock: React.FC<JobBoardBlockProps & { id?: string }> = async ({
  heading,
  subtitle,
}) => {
  const jobDocs = await getCachedJobBoardJobs()()

  const jobs: JobItem[] = jobDocs.map((doc) => ({
    id: String(doc.id),
    title: doc.title,
    department: doc.department,
    location: doc.location,
    salaryLabel: doc.salaryLabel ?? null,
    linkedinUrl: doc.linkedinUrl ?? null,
  }))

  return <JobBoardClient jobs={jobs} heading={heading} subtitle={subtitle} />
}
