'use client'

import { TablerIcon } from '@/components/TablerIcon'
import type { PolicyTabsBlock as PolicyTabsBlockProps } from '@/payload-types'
import { cn } from '@/utilities/ui'
import { Tab, Tabs } from '@heroui/react'
import React from 'react'

type Props = PolicyTabsBlockProps & { className?: string }

export const PolicyTabsBlock: React.FC<Props> = ({ tabs, className }) => {
  if (!tabs || tabs.length === 0) return null

  return (
    <div className={cn('w-full', className)}>
      <Tabs
        aria-label="Policy tabs"
        variant="underlined"
        color="primary"
        classNames={{
          tabList: 'gap-0 p-0',
          cursor: 'bg-blue-600',
          tab: 'px-4 h-auto py-2',
          tabContent:
            'text-xs font-semibold tracking-wide uppercase whitespace-nowrap text-gray-500 group-data-[selected=true]:text-blue-600',
        }}
      >
        {tabs.map((tab, index) => (
          <Tab
            key={tab.id ?? index}
            title={
              <div className="flex items-center gap-1.5">
                {tab.icon && <TablerIcon name={tab.icon} size={16} className="shrink-0" />}
                <span>{tab.tabName}</span>
              </div>
            }
          >
            {/* Tab content — checklist */}
            {tab.items && tab.items.length > 0 && (
              <ul className="mt-4 space-y-2">
                {tab.items.map((item, i) => (
                  <li key={item.id ?? i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 shrink-0 w-4 h-4 rounded-md bg-blue-600 flex items-center justify-center">
                      <TablerIcon name="check" size={12} className="text-blue-100" stroke={2} />
                    </span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </Tab>
        ))}
      </Tabs>
    </div>
  )
}
