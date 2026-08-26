import clsx from 'clsx'
import { Link } from '@/i18n/navigation'
import React from 'react'
import { useTranslations } from 'next-intl'
import { IconArrowRight } from '@tabler/icons-react'
import RichText from '@/components/RichText'

import type { Post } from '@/payload-types'

import { Card } from '../../components/Card'
import { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'

export type RelatedPostsProps = {
  className?: string
  docs?: Post[]
  introContent?: DefaultTypedEditorState
  limit?: number
}

export const RelatedPosts: React.FC<RelatedPostsProps> = (props) => {
  const { className, docs, introContent, limit = 2 } = props
  const t = useTranslations('RelatedPosts')

  const visibleDocs = (docs ?? []).filter((doc) => typeof doc === 'object').slice(0, limit)

  if (visibleDocs.length === 0) return null

  return (
    <section className={clsx('w-full', className)}>
      {introContent ? (
        <RichText data={introContent} enableGutter={false} />
      ) : (
        <div className="flex items-end justify-between gap-4 mb-8 md:mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-2">
              {t('eyebrow')}
            </p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
              {t('title')}
            </h2>
          </div>
          <Link
            href="/posts"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all whitespace-nowrap"
          >
            {t('viewAll')}
            <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6 items-stretch">
        {visibleDocs.map((doc, index) => (
          <Card key={index} doc={doc} relationTo="posts" showCategories showDescription />
        ))}
      </div>
    </section>
  )
}
