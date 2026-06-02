'use client'

import { submitContact } from '@/actions/submitContact'
import {
  IconCheck,
  IconLoader2,
  IconMail,
  IconMapPin,
  IconPhone,
  IconSend,
} from '@tabler/icons-react'
import { useState, useTransition } from 'react'

export type NewsletterLabels = {
  namePlaceholder: string
  emailPlaceholder: string
  subjectPlaceholder: string
  messageLabel: string
  messagePlaceholder: string
  submit: string
  submitting: string
  successTitle: string
  successBody: string
  errorEmail: string
  errorRequired: string
}

type ContactInfo = {
  title?: string | null
  description?: string | null
  phones?: ({ number?: string | null; id?: string | null } | null)[] | null
  email?: string | null
  address?: string | null
} | null

type Props = {
  eyebrow?: string | null
  heading: string
  subtitle?: string | null
  contact?: ContactInfo
  labels: NewsletterLabels
}

export function NewsletterSignupClient({ eyebrow, heading, subtitle, contact, labels }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const phones = (contact?.phones ?? []).filter((p) => p?.number)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !message.trim()) {
      setError(labels.errorRequired)
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(labels.errorEmail)
      return
    }

    const fd = new FormData()
    fd.set('name', name)
    fd.set('email', email)
    if (subject) fd.set('subject', subject)
    fd.set('message', message)

    startTransition(async () => {
      const result = await submitContact(fd)
      if (result.ok) {
        setSuccess(true)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <section className="relative overflow-hidden bg-linear-to-b from-sky-50 via-white to-transparent py-20 px-4 sm:px-6">
      {/* Decorative blobs (kept in the upper area so the bottom edge fades cleanly) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2/3" aria-hidden>
        <div className="absolute -top-40 -left-40 w-120 h-120 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute top-0 -right-24 w-120 h-100 rounded-full bg-blue-200/35 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          {eyebrow && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#006FEE]">
              {eyebrow}
            </p>
          )}
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight mb-4">
            {heading}
          </h2>
          {subtitle && <p className="text-base sm:text-lg text-slate-500">{subtitle}</p>}
        </div>

        {/* Card */}
        <div className="grid lg:grid-cols-5 rounded-3xl bg-white shadow-[0_30px_80px_-30px_rgba(0,111,238,0.35)] ring-1 ring-slate-900/5 overflow-hidden">
          {/* Left: contact info panel */}
          <div className="lg:col-span-2 relative overflow-hidden bg-linear-to-br from-[#006FEE] via-[#0b86f5] to-[#0EA5E9] p-8 sm:p-10 text-white">
            {/* decorative circles (like the reference) */}
            <div
              className="pointer-events-none absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-white/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-24 left-16 w-48 h-48 rounded-full bg-white/5"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-xl"
              aria-hidden
            />

            <div className="relative z-10">
              {contact?.title && <h3 className="text-xl font-bold mb-3">{contact.title}</h3>}
              {contact?.description && (
                <p className="text-sm text-white/70 leading-relaxed mb-10 max-w-xs">
                  {contact.description}
                </p>
              )}

              <ul className="space-y-6">
                {phones.length > 0 && (
                  <li className="flex items-start gap-4">
                    <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/15 ring-1 ring-white/20">
                      <IconPhone size={18} className="text-white" />
                    </span>
                    <div className="flex flex-col gap-0.5 pt-1.5">
                      {phones.map((p, i) => (
                        <a
                          key={p?.id ?? i}
                          href={`tel:${p?.number?.replace(/\s+/g, '')}`}
                          className="text-sm text-white/90 hover:text-white transition-colors"
                        >
                          {p?.number}
                        </a>
                      ))}
                    </div>
                  </li>
                )}

                {contact?.email && (
                  <li className="flex items-center gap-4">
                    <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/15 ring-1 ring-white/20">
                      <IconMail size={18} className="text-white" />
                    </span>
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-sm text-white/90 hover:text-white transition-colors break-all"
                    >
                      {contact.email}
                    </a>
                  </li>
                )}

                {contact?.address && (
                  <li className="flex items-center gap-4">
                    <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/15 ring-1 ring-white/20">
                      <IconMapPin size={18} className="text-white" />
                    </span>
                    <span className="text-sm text-white/90">{contact.address}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:col-span-3 p-8 sm:p-10">
            {success ? (
              <div className="flex flex-col items-center justify-center text-center gap-3 h-full py-10">
                <div className="w-16 h-16 rounded-full bg-green-100 border border-green-200 flex items-center justify-center">
                  <IconCheck size={30} className="text-green-600" />
                </div>
                <p className="text-lg font-semibold text-slate-900">{labels.successTitle}</p>
                <p className="text-sm text-slate-500 max-w-xs">{labels.successBody}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <Field label={labels.namePlaceholder}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      maxLength={200}
                      className="contact-input"
                    />
                  </Field>
                  <Field label={labels.emailPlaceholder}>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="contact-input"
                    />
                  </Field>
                </div>

                <Field label={labels.subjectPlaceholder}>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={200}
                    className="contact-input"
                  />
                </Field>

                <Field label={labels.messageLabel} accent>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={labels.messagePlaceholder}
                    rows={3}
                    maxLength={5000}
                    className="contact-input resize-none placeholder:text-slate-400"
                  />
                </Field>

                {error && <p className="text-sm text-red-500 -mt-2">{error}</p>}

                <div>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#006FEE] to-[#0EA5E9] hover:opacity-90 active:opacity-100 disabled:opacity-55 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#006FEE]/30 transition-all hover:-translate-y-0.5 hover:shadow-[#006FEE]/40 cursor-pointer"
                  >
                    {isPending ? (
                      <IconLoader2 size={16} className="animate-spin" />
                    ) : (
                      <IconSend size={16} />
                    )}
                    <span>{isPending ? labels.submitting : labels.submit}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({
  label,
  accent,
  children,
}: {
  label: string
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="group flex flex-col gap-1.5">
      <span className={`text-xs font-semibold ${accent ? 'text-[#006FEE]' : 'text-slate-500'}`}>
        {label}
      </span>
      {children}
    </label>
  )
}
