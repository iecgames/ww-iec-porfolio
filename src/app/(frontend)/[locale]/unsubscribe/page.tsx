import configPromise from '@payload-config'
import { getTranslations } from 'next-intl/server'
import { getPayload } from 'payload'
import { Link } from '@/i18n/navigation'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ token?: string }>
}

type UnsubscribeResult = 'success' | 'already' | 'invalid'

async function processUnsubscribe(token: string): Promise<UnsubscribeResult> {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'subscribers',
    where: { unsubscribeToken: { equals: token } },
    limit: 1,
    overrideAccess: true,
  })

  if (result.totalDocs === 0) return 'invalid'

  const subscriber = result.docs[0]
  if (!subscriber.subscribed) return 'already'

  await payload.update({
    collection: 'subscribers',
    id: subscriber.id,
    data: {
      subscribed: false,
      unsubscribedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  })

  return 'success'
}

export default async function UnsubscribePage({ params, searchParams }: Props) {
  const { locale } = await params
  const { token } = await searchParams
  const t = await getTranslations({ locale, namespace: 'Unsubscribe' })

  const status: UnsubscribeResult = token ? await processUnsubscribe(token) : 'invalid'

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>

        {status === 'success' && (
          <div className="space-y-2">
            <p className="text-green-600 dark:text-green-400 font-medium">{t('success')}</p>
            <p className="text-muted-foreground text-sm">{t('successDescription')}</p>
          </div>
        )}

        {status === 'already' && (
          <p className="text-muted-foreground">{t('alreadyUnsubscribed')}</p>
        )}

        {status === 'invalid' && (
          <p className="text-destructive">{t('invalidToken')}</p>
        )}

        <Link
          href={`/${locale}`}
          className="inline-block text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('backHome')}
        </Link>
      </div>
    </main>
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Unsubscribe' })
  return { title: t('title') }
}