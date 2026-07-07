import { resendAdapter } from '@payloadcms/email-resend'

export const emailAdapter = () => {
  const defaultFromAddress = process.env.EMAIL_FROM ?? 'noreply@example.com'
  const defaultFromName = process.env.EMAIL_FROM_NAME ?? 'IEC'

  return resendAdapter({
    defaultFromAddress,
    defaultFromName,
    apiKey: process.env.RESEND_API_KEY ?? '',
  })
}
