'use client'

import {
  IconBrandDiscord,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTiktok,
  IconBrandTwitter,
  IconBrandYoutube,
  IconSend,
} from '@tabler/icons-react'
import { motion } from 'framer-motion'
import Image from 'next/image'

import { JobApplyModal } from '@/components/JobApplyModal'

export type SocialItem = {
  id: string
  platform: 'linkedin' | 'facebook' | 'instagram' | 'youtube' | 'twitter' | 'tiktok' | 'discord'
  url: string
}

export type ApplyLabels = {
  triggerLabel: string
  title: string
  subtitle: string
  fullName: string
  email: string
  phone: string
  position: string
  positionPlaceholder?: string
  experience: string
  additionalLink: string
  additionalLinkPlaceholder: string
  additionalLinkHint: string
  cv: string
  cvHint: string
  close: string
  required: string
  disabledTitle: string
  disabledBody: string
  disabledMailButton: string
}

export type SendUsCVProps = {
  heading?: string
  subtitle?: string
  cvUrl?: string
  innovatorLabel?: string
  socials?: SocialItem[]
  applyLabels: ApplyLabels
  recruitmentEmail?: string | null
}

function SocialIcon({ platform }: { platform: SocialItem['platform'] }) {
  const cls = 'w-5 h-5'
  switch (platform) {
    case 'linkedin':
      return <IconBrandLinkedin className={cls} />
    case 'facebook':
      return <IconBrandFacebook className={cls} />
    case 'instagram':
      return <IconBrandInstagram className={cls} />
    case 'youtube':
      return <IconBrandYoutube className={cls} />
    case 'twitter':
      return <IconBrandTwitter className={cls} />
    case 'tiktok':
      return <IconBrandTiktok className={cls} />
    case 'discord':
      return <IconBrandDiscord className={cls} />
    default:
      return null
  }
}

export function SendUsCVClient({
  heading,
  subtitle,
  innovatorLabel,
  socials = [],
  applyLabels,
  recruitmentEmail,
}: SendUsCVProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#0b1226] via-[#0f1729] to-[#101a36] text-white px-8 sm:px-12 py-12 sm:py-16 flex flex-col items-center text-center shadow-xl"
    >
      {/* Soft radial accent */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      {/* Decorative puzzle icon */}
      <div className="pointer-events-none absolute right-2 bottom-2 opacity-5 select-none">
        <svg
          width="240"
          height="240"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M140 60c0-11 9-20 20-20s20 9 20 20-9 20-20 20h-20V60zM80 140c11 0 20 9 20 20s-9 20-20 20-20-9-20-20v-20h20zM60 80H40c-11 0-20-9-20-20s9-20 20-20 20 9 20 20v20zM120 120v20c0 11 9 20 20 20s20-9 20-20-9-20-20-20h-20zM60 80v60h60V80H60z"
            fill="white"
          />
        </svg>
      </div>

      {/* Floating mascot — left (looping y bob + rotate sway + scale breathing) */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-4 sm:left-2 md:left-6 bottom-2 sm:bottom-4 hidden sm:block select-none"
        initial={{ opacity: 0, x: -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
      >
        <motion.div
          animate={{
            y: [0, -14, 0, -6, 0],
            rotate: [-6, -2, -6, -8, -6],
            scale: [1, 1.03, 1, 1.02, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
          }}
        >
          <Image
            src="/mascot/mascot_2.png"
            alt=""
            width={160}
            height={200}
            className="w-28 md:w-36 lg:w-40 h-auto drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
          />
        </motion.div>
      </motion.div>

      {/* Floating mascot — right (looping y bob + rotate sway + scale breathing) */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-4 sm:right-2 md:right-6 top-4 sm:top-6 hidden sm:block select-none"
        initial={{ opacity: 0, x: 40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
      >
        <motion.div
          animate={{
            y: [0, -10, 0, -16, 0],
            rotate: [8, 12, 8, 5, 8],
            scale: [1, 1.04, 1, 1.02, 1],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
          }}
        >
          <Image
            src="/mascot/mascot_3.png"
            alt=""
            width={160}
            height={200}
            className="w-24 md:w-32 lg:w-36 h-auto drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
          />
        </motion.div>
      </motion.div>

      {/* Content (above decorations) */}
      <div className="relative z-10 flex flex-col items-center">
        {heading && (
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4 max-w-2xl leading-tight"
          >
            {heading}
          </motion.h2>
        )}
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-gray-300 text-sm sm:text-base max-w-lg leading-relaxed mb-8"
          >
            {subtitle}
          </motion.p>
        )}

        {/* CTA — opens application modal */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mb-8"
        >
          <JobApplyModal
            labels={applyLabels}
            recruitmentEmail={recruitmentEmail}
            trigger={
              <motion.span
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-white text-[#0f1729] text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-shadow"
              >
                <IconSend size={18} />
                {applyLabels.triggerLabel}
              </motion.span>
            }
            triggerClassName="inline-flex"
          />
        </motion.div>

        {/* Social icons */}
        {socials.length > 0 && (
          <div className="flex items-center gap-4 mb-6">
            {socials.map((s, i) => (
              <motion.a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.platform}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                whileHover={{ y: -2 }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SocialIcon platform={s.platform} />
              </motion.a>
            ))}
          </div>
        )}

        {/* Innovator label */}
        {innovatorLabel && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300">{innovatorLabel}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
