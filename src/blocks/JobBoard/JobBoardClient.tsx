'use client'

import { Button, Input, Select, SelectItem } from '@heroui/react'
import { IconSearch, IconStack2 } from '@tabler/icons-react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import Image from 'next/image'
import { useMemo, useRef, useState } from 'react'

import { JobCard, type JobCardData } from '@/components/JobCard'

export type JobItem = JobCardData

type ParallaxMascotProps = {
  src: string
  alt?: string
  position: string
  size: string
  depth: number
  driftRange?: number
  driftDuration?: number
  driftRotate?: [number, number, number]
  initialFrom: { x?: number; y?: number; rotate?: number; scale?: number }
  rest?: { rotate?: number }
  delay?: number
  mouseX: MotionValue<number>
  mouseY: MotionValue<number>
  reducedMotion: boolean
}

function ParallaxMascot({
  src,
  alt = '',
  position,
  size,
  depth,
  driftRange = 14,
  driftDuration = 5,
  driftRotate,
  initialFrom,
  rest,
  delay = 0,
  mouseX,
  mouseY,
  reducedMotion,
}: ParallaxMascotProps) {
  // Map normalized mouse (-1..1) to parallax offset in px, scaled by depth.
  const rawX = useTransform(mouseX, [-1, 1], [-40 * depth, 40 * depth])
  const rawY = useTransform(mouseY, [-1, 1], [-25 * depth, 25 * depth])
  const rawRotate = useTransform(mouseX, [-1, 1], [-6 * depth, 6 * depth])

  const x = useSpring(rawX, { stiffness: 80, damping: 16, mass: 0.6 })
  const y = useSpring(rawY, { stiffness: 80, damping: 16, mass: 0.6 })
  const rotate = useSpring(rawRotate, { stiffness: 80, damping: 18 })

  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute hidden md:block select-none will-change-transform ${position}`}
      initial={{
        opacity: 0,
        x: initialFrom.x ?? 0,
        y: initialFrom.y ?? 0,
        rotate: initialFrom.rotate ?? 0,
        scale: initialFrom.scale ?? 0.85,
      }}
      whileInView={{ opacity: 1, x: 0, y: 0, rotate: rest?.rotate ?? 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      style={reducedMotion ? undefined : { x, y, rotate }}
    >
      {/* Drift / breathing inner wrapper — independent of the parallax transform */}
      <motion.div
        animate={
          reducedMotion
            ? undefined
            : {
                y: [0, -driftRange, 0],
                rotate: driftRotate ?? [0, 2, -2, 0],
              }
        }
        transition={
          reducedMotion
            ? undefined
            : {
                duration: driftDuration,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
        whileHover={{ scale: 1.06 }}
      >
        <Image
          src={src}
          alt={alt}
          width={320}
          height={400}
          priority={false}
          className={`${size} h-auto drop-shadow-[0_18px_40px_rgba(15,23,42,0.25)]`}
        />
      </motion.div>
    </motion.div>
  )
}

export function JobBoardClient({
  jobs,
  heading,
  subtitle,
}: {
  jobs: JobItem[]
  heading?: string | null
  subtitle?: string | null
}) {
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState<string>('')

  const departments = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.department).filter(Boolean))).sort(),
    [jobs],
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return jobs.filter((j) => {
      const matchesQuery =
        !q ||
        (j.title ?? '').toLowerCase().includes(q) ||
        (j.department ?? '').toLowerCase().includes(q)
      const matchesDept = !department || j.department === department
      return matchesQuery && matchesDept
    })
  }, [jobs, query, department])

  // Cursor parallax: normalized -1..1 across the section's bounding box.
  const sectionRef = useRef<HTMLElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const reducedMotion = useReducedMotion() ?? false

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (reducedMotion) return
    const rect = sectionRef.current?.getBoundingClientRect()
    if (!rect) return
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1
    mouseX.set(nx)
    mouseY.set(ny)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full py-20 md:py-28 px-4 overflow-hidden"
    >
      {/* Decorative mascots — larger, parallax + breathing animation */}
      <ParallaxMascot
        src="/mascot/mascot_1.png"
        position="right-2 lg:right-10 xl:right-16 top-10 md:top-12 lg:top-16"
        size="w-40 md:w-48 lg:w-64 xl:w-72"
        depth={1.6}
        driftRange={22}
        driftDuration={6}
        driftRotate={[6, -2, 6]}
        initialFrom={{ x: 60, y: -10, rotate: 12, scale: 0.8 }}
        rest={{ rotate: 6 }}
        delay={0.12}
        mouseX={mouseX}
        mouseY={mouseY}
        reducedMotion={reducedMotion}
      />
      <ParallaxMascot
        src="/mascot/mascot_3.png"
        position="left-[8%] lg:left-[14%] bottom-2 lg:bottom-6 hidden lg:block"
        size="w-32 lg:w-40 xl:w-48"
        depth={0.7}
        driftRange={12}
        driftDuration={4.5}
        driftRotate={[-3, 5, -3]}
        initialFrom={{ x: -30, y: 30, rotate: -8, scale: 0.85 }}
        rest={{ rotate: -3 }}
        delay={0.24}
        mouseX={mouseX}
        mouseY={mouseY}
        reducedMotion={reducedMotion}
      />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="text-center mb-10"
        >
          {heading && (
            <p className="text-sm font-medium text-gray-500 mb-1 tracking-wide uppercase">
              {heading}
            </p>
          )}
          {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
        </motion.div>

        {/* Search + Filters bar */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-4 py-3 mb-8 flex flex-wrap gap-3 items-center">
          {/* Search input */}
          <div className="flex-1 min-w-52">
            <Input
              placeholder="Search for roles..."
              value={query}
              onValueChange={setQuery}
              variant="underlined"
              color="primary"
              startContent={<IconSearch size={16} className="text-gray-400 shrink-0" />}
            />
          </div>

          <div className="h-6 w-px bg-gray-200 hidden sm:block" />

          {/* Department filter */}
          <div className="min-w-44">
            <Select
              placeholder="All Departments"
              color="primary"
              selectedKeys={department ? new Set([department]) : new Set()}
              onSelectionChange={(keys) => {
                const val = Array.from(keys)[0] as string
                setDepartment(val ?? '')
              }}
              variant="underlined"
              startContent={<IconStack2 size={16} className="text-gray-400 shrink-0" />}
            >
              {departments.map((dept) => (
                <SelectItem key={dept}>{dept}</SelectItem>
              ))}
            </Select>
          </div>

          {/* Clear filters — only shown when active */}
          {(department || query) && (
            <Button
              size="sm"
              variant="flat"
              radius="lg"
              className="text-gray-500 bg-gray-100 hover:bg-gray-200 shrink-0"
              onPress={() => {
                setQuery('')
                setDepartment('')
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Job grid */}
        {filtered.length > 0 ? (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((job, i) => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, delay: i * 0.05, ease: 'easeOut' }}
                >
                  <JobCard job={job} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-gray-400 text-sm py-16"
          >
            No roles found. Try adjusting your search or filters.
          </motion.p>
        )}
      </div>
    </section>
  )
}
