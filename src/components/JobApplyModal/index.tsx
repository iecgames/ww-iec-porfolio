'use client'

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from '@heroui/react'
import { IconInfoCircle, IconMail, IconPaperclip } from '@tabler/icons-react'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Labels = {
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

type Props = {
  jobId?: string
  jobTitle?: string
  labels: Labels
  className?: string
  triggerClassName?: string
  trigger?: React.ReactNode
  /** Address candidates should email their CV to. Falls back to the HR mailbox. */
  recruitmentEmail?: string | null
}

const FALLBACK_RECRUITMENT_EMAIL = 'hr@iecorp.vn'

/**
 * Applications are handled by a separate recruitment service, so this form no
 * longer accepts submissions. The fields stay visible (and disabled) so the
 * page still reads as an application flow, with a notice pointing candidates
 * at the HR mailbox instead.
 */
export function JobApplyModal({
  jobId,
  jobTitle,
  labels,
  className,
  triggerClassName,
  trigger,
  recruitmentEmail,
}: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  const isGeneral = !jobId
  const hrEmail = recruitmentEmail?.trim() || FALLBACK_RECRUITMENT_EMAIL

  const mailtoHref = `mailto:${hrEmail}?subject=${encodeURIComponent(
    jobTitle ? `${labels.title} — ${jobTitle}` : labels.title,
  )}`

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {trigger ? (
        <button
          type="button"
          className={triggerClassName}
          onClick={onOpen}
          aria-label={labels.triggerLabel}
        >
          {trigger}
        </button>
      ) : (
        <Button className={className} size="lg" onClick={onOpen}>
          {labels.triggerLabel}
        </Button>
      )}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="2xl"
        scrollBehavior="inside"
        backdrop="blur"
        classNames={{
          backdrop: 'bg-gray-900/70 backdrop-blur-md',
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-0.5 border-b border-gray-100">
            {jobTitle && <span className="text-xl font-semibold text-gray-900">{jobTitle}</span>}
            <span className="text-sm font-normal text-gray-500">{labels.subtitle}</span>
          </ModalHeader>

          <ModalBody className="py-4 space-y-3">
            {/* Notice replacing the submit flow */}
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
              <IconInfoCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-900">{labels.disabledTitle}</p>
                <p className="text-sm text-amber-800 leading-relaxed">{labels.disabledBody}</p>
                <a
                  href={mailtoHref}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950"
                >
                  <IconMail size={16} />
                  {hrEmail}
                </a>
              </div>
            </div>

            <fieldset disabled className="contents">
              <div>
                <Label htmlFor="fullName">
                  {labels.fullName} <RequiredMark />
                </Label>
                <Input id="fullName" autoComplete="name" disabled />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">
                    {labels.email} <RequiredMark />
                  </Label>
                  <Input id="email" type="email" autoComplete="email" disabled />
                </div>
                <div>
                  <Label htmlFor="phone">
                    {labels.phone} <RequiredMark />
                  </Label>
                  <Input id="phone" type="tel" autoComplete="tel" disabled />
                </div>
              </div>

              <div>
                <Label htmlFor="position">{labels.position}</Label>
                <Input
                  id="position"
                  placeholder={isGeneral ? labels.positionPlaceholder : undefined}
                  value={isGeneral ? undefined : (jobTitle ?? '')}
                  readOnly={!isGeneral}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="experience">{labels.experience}</Label>
                <Textarea id="experience" rows={4} disabled />
              </div>

              <div>
                <Label htmlFor="additionalLink">{labels.additionalLink}</Label>
                <Input
                  id="additionalLink"
                  type="url"
                  placeholder={labels.additionalLinkPlaceholder}
                  disabled
                />
                <p className="mt-1 text-xs text-gray-500">{labels.additionalLinkHint}</p>
              </div>

              <div>
                <Label htmlFor="cv">
                  {labels.cv} <RequiredMark />
                </Label>
                <div className="mt-1">
                  <div className="w-full rounded-md border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 flex flex-col items-center gap-2 text-gray-400 cursor-not-allowed">
                    <IconPaperclip size={20} />
                    <span className="text-sm">{labels.cv}</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">{labels.cvHint}</p>
              </div>
            </fieldset>
          </ModalBody>
          <ModalFooter className="border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => onOpenChange()}>
              {labels.close}
            </Button>
            <Button asChild>
              <a href={mailtoHref}>
                <IconMail size={16} />
                {labels.disabledMailButton}
              </a>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

function RequiredMark() {
  return (
    <span className="text-red-500" aria-hidden>
      *
    </span>
  )
}
