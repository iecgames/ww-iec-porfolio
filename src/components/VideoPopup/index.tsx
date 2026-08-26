'use client'

import React from 'react'

import { Modal, ModalBody, ModalContent, addToast, useDisclosure } from '@heroui/react'
import { IconPlayerPlayFilled } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/utilities/ui'

type Props = {
  url: string
  className?: string
  ariaLabel?: string
  /**
   * Custom button content. Supplied by CMSLink and the hero so a video link
   * looks like every other link around it. Omit to keep the round play button.
   */
  trigger?: React.ReactNode
}

function getYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)
  return m ? m[1] : null
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return m ? m[1] : null
}

export const VideoPopup: React.FC<Props> = ({ url, className, ariaLabel, trigger }) => {
  const t = useTranslations('Video')
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  const youtubeId = getYoutubeId(url)
  const vimeoId = getVimeoId(url)
  const isValid = Boolean(youtubeId || vimeoId || /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url))

  const handleOpen = () => {
    if (!isValid) {
      addToast({
        title: t('errorTitle'),
        description: t('errorBody'),
        color: 'danger',
      })
      return
    }
    onOpen()
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={ariaLabel ?? t('play')}
        className={cn(
          trigger
            ? className
            : cn(
                'inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/50 bg-white/55 text-primary shadow-[0_10px_24px_-8px_rgba(0,111,238,0.35)] backdrop-blur-xl backdrop-saturate-150 transition duration-200 hover:-translate-y-0.5 hover:bg-white/75 hover:shadow-[0_16px_30px_-8px_rgba(0,111,238,0.55)]',
                className,
              ),
        )}
      >
        {trigger ?? <IconPlayerPlayFilled size={18} />}
      </button>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="3xl"
        placement="center"
        backdrop="blur"
      >
        <ModalContent>
          {() => (
            <ModalBody className="p-0">
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                {youtubeId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                    title={t('iframeTitle')}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                ) : vimeoId ? (
                  <iframe
                    src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
                    title={t('iframeTitle')}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                ) : (
                  <video
                    src={url}
                    controls
                    autoPlay
                    className="h-full w-full"
                  />
                )}
              </div>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}
