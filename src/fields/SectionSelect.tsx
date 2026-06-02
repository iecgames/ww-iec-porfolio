'use client'

import { FieldLabel, useAllFormFields, useField } from '@payloadcms/ui'
import React, { useMemo } from 'react'

type SectionSelectProps = {
  path: string
  field?: {
    label?: string | Record<string, string> | false
    admin?: { description?: string }
  }
  readOnly?: boolean
}

/**
 * Custom admin field: a dropdown of every top-level layout block that has an
 * Anchor ID. Reads the live form state (the document's `layout` blocks) so editors
 * pick an existing section instead of typing a raw "#anchor". Stores "#anchor".
 *
 * On documents without a `layout` field (e.g. Header / Footer globals) the list is
 * empty and a hint is shown — section links only make sense within a page's content.
 */
export const SectionSelect: React.FC<SectionSelectProps> = ({ path, field, readOnly }) => {
  const { value, setValue } = useField<string>({ path })
  const [fields] = useAllFormFields()

  const options = useMemo(() => {
    const result: { value: string; label: string }[] = []
    Object.keys(fields).forEach((key) => {
      const match = key.match(/^layout\.(\d+)\.anchor$/)
      if (!match) return
      const anchor = fields[key]?.value
      if (!anchor || typeof anchor !== 'string') return
      const blockType = fields[`layout.${match[1]}.blockType`]?.value
      result.push({
        value: `#${anchor}`,
        label: `#${anchor}${typeof blockType === 'string' ? ` — ${blockType}` : ''}`,
      })
    })
    return result
  }, [fields])

  const label = typeof field?.label === 'string' ? field.label : 'Anchor on this page'
  const description = field?.admin?.description

  return (
    <div className="field-type" style={{ marginBottom: 'var(--spacing-field, 1.5rem)' }}>
      <FieldLabel label={label} path={path} />

      <select
        value={value ?? ''}
        disabled={readOnly}
        onChange={(e) => setValue(e.target.value)}
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '9px 12px',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: 4,
          background: 'var(--theme-input-bg)',
          color: value ? 'var(--theme-text)' : 'var(--theme-elevation-400)',
          cursor: readOnly ? 'not-allowed' : 'pointer',
        }}
      >
        <option value="">— Chọn section —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {options.length === 0 && (
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--theme-elevation-400)' }}>
          Chưa có section nào có Anchor ID. Mở tab Content, mở một block và điền ô “Anchor ID”.
        </div>
      )}

      {description && (
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--theme-elevation-400)' }}>
          {description}
        </div>
      )}
    </div>
  )
}
