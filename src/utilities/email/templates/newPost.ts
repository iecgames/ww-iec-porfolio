import { baseTemplate } from './base'

type NewPostTemplateArgs = {
  post: {
    title: string
    slug: string
  }
  subscriber: { name?: string | null }
  unsubscribeUrl: string
  siteUrl: string
  previewText?: string
  logoUrl?: string
}

export function newPostTemplate({
  post,
  subscriber,
  unsubscribeUrl,
  siteUrl,
  previewText,
  logoUrl,
}: NewPostTemplateArgs): { html: string; subject: string } {
  const subject = `[IEC] Bài viết mới: ${post.title}`
  const greeting = subscriber.name ? `Xin chào <strong>${subscriber.name}</strong>,` : 'Xin chào,'

  const postUrl = `${siteUrl}/posts/${post.slug}`

  const bodyHtml = `
    <p style="margin:0 0 16px;">${greeting}</p>
    <p style="margin:0 0 24px;color:#4b5563;">IEC vừa đăng tải một bài viết mới:</p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f9fafb;border-radius:6px;border-left:4px solid #10b981;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <h2 style="margin:0 0 8px;font-size:18px;color:#1a1a1a;">${post.title}</h2>
        </td>
      </tr>
    </table>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="background-color:#10b981;border-radius:6px;">
          <a href="${postUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;">Đọc thêm &rarr;</a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">Nếu nút không hoạt động, vui lòng truy cập: <a href="${postUrl}" style="color:#10b981;">${postUrl}</a></p>
  `

  const html = baseTemplate({ bodyHtml, unsubscribeUrl, siteUrl, previewText, logoUrl })

  return { html, subject }
}
