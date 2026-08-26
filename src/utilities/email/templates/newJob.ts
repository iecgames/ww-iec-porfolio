import { baseTemplate } from './base'

type NewJobTemplateArgs = {
  job: {
    id: string | number
    title: string
    description?: string
  }
  subscriber: { name?: string | null }
  unsubscribeUrl: string
  siteUrl: string
  previewText?: string
  logoUrl?: string
}

export function newJobTemplate({
  job,
  subscriber,
  unsubscribeUrl,
  siteUrl,
  previewText,
  logoUrl,
}: NewJobTemplateArgs): {
  html: string
  subject: string
} {
  const subject = `[IEC] Cơ hội việc làm mới: ${job.title}`
  const greeting = subscriber.name ? `Xin chào <strong>${subscriber.name}</strong>,` : 'Xin chào,'

  const jobUrl = `${siteUrl}/career/${job.id}`
  const descriptionSnippet = job.description
    ? `<p style="margin:0 0 16px;color:#4b5563;">${job.description.slice(0, 300)}${job.description.length > 300 ? '...' : ''}</p>`
    : ''

  const bodyHtml = `
    <p style="margin:0 0 16px;">${greeting}</p>
    <p style="margin:0 0 24px;color:#4b5563;">IEC vừa đăng tuyển một vị trí mới phù hợp với bạn:</p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f9fafb;border-radius:6px;border-left:4px solid #3b82f6;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <h2 style="margin:0 0 8px;font-size:18px;color:#1a1a1a;">${job.title}</h2>
          ${descriptionSnippet}
        </td>
      </tr>
    </table>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="background-color:#3b82f6;border-radius:6px;">
          <a href="${jobUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;">Xem chi tiết &rarr;</a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">Nếu nút không hoạt động, vui lòng truy cập: <a href="${jobUrl}" style="color:#3b82f6;">${jobUrl}</a></p>
  `

  const html = baseTemplate({ bodyHtml, unsubscribeUrl, siteUrl, previewText, logoUrl })

  return { html, subject }
}
