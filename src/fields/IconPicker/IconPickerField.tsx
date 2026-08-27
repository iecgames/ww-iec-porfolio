'use client'

import { FieldLabel, useField } from '@payloadcms/ui'
import React, { useMemo, useRef, useState } from 'react'

import { getRegisteredIcon, registeredIconNames } from '@/components/TablerIcon/iconRegistry'

/**
 * Chỉ chào những icon có trong registry, vì registry đúng bằng tập icon
 * frontend render được — xem `src/components/TablerIcon/iconRegistry.ts`.
 *
 * Bản cũ liệt kê cả ~6.090 tên từ `icons-list.mjs` và render bằng
 * `import * as TablerIcons`, nên editor chọn được icon mà frontend không có
 * cách nào vẽ ra.
 */
function PreviewIcon({ name, size = 22 }: { name: string; size?: number }) {
  const Icon = getRegisteredIcon(name)
  return Icon ? <Icon size={size} stroke={1.75} /> : null
}

type IconPickerFieldProps = {
  path: string
  field?: {
    label?: string | Record<string, string> | false
    admin?: { description?: string }
  }
  readOnly?: boolean
}

// Registry hiện có 155 icon nên mức trần này để nguyên cả danh sách khi không
// tìm kiếm; nó chỉ còn là lưới an toàn nếu registry phình về sau.
const MAX_RESULTS = 200

export const IconPickerField: React.FC<IconPickerFieldProps> = ({ path, field, readOnly }) => {
  const { value, setValue } = useField<string>({ path })
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q ? registeredIconNames.filter((n) => n.includes(q)) : registeredIconNames
    return list.slice(0, MAX_RESULTS)
  }, [search])

  const label = typeof field?.label === 'string' ? field.label : 'Icon'
  const description = field?.admin?.description

  const select = (name: string) => {
    setValue(name)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="field-type" style={{ marginBottom: 'var(--spacing-field, 1.5rem)' }}>
      <FieldLabel label={label} path={path} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          disabled={readOnly}
          onClick={() => {
            setOpen((o) => !o)
            requestAnimationFrame(() => searchRef.current?.focus())
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 4,
            background: 'var(--theme-input-bg)',
            color: value ? 'var(--theme-text)' : 'var(--theme-elevation-400)',
            cursor: readOnly ? 'not-allowed' : 'pointer',
            minWidth: 200,
          }}
        >
          {value ? (
            <>
              <PreviewIcon name={value} size={20} />
              <span style={{ fontFamily: 'monospace' }}>{value}</span>
            </>
          ) : (
            <span>Chọn icon…</span>
          )}
        </button>

        {value && !readOnly && (
          <button
            type="button"
            onClick={() => setValue('')}
            aria-label="Xoá icon"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--theme-elevation-400)',
              fontSize: 16,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {description && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: 'var(--theme-elevation-400)',
          }}
        >
          {description}
        </div>
      )}

      {open && !readOnly && (
        <div
          style={{
            marginTop: 8,
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 6,
            background: 'var(--theme-elevation-0)',
            padding: 10,
            maxWidth: 420,
          }}
        >
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm icon (vd: shield, home, arrow)…"
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: 4,
              background: 'var(--theme-input-bg)',
              color: 'var(--theme-text)',
              marginBottom: 10,
            }}
          />

          {results.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                gap: 4,
                maxHeight: 260,
                overflowY: 'auto',
              }}
            >
              {results.map((name) => {
                const active = name === value
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => select(name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      aspectRatio: '1 / 1',
                      border: active
                        ? '1px solid var(--theme-success-500)'
                        : '1px solid transparent',
                      borderRadius: 6,
                      background: active ? 'var(--theme-success-100)' : 'transparent',
                      color: 'var(--theme-text)',
                      cursor: 'pointer',
                    }}
                  >
                    <PreviewIcon name={name} size={22} />
                  </button>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--theme-elevation-400)', margin: '4px 0' }}>
              Không tìm thấy icon nào.
            </p>
          )}

          <p style={{ fontSize: 11, color: 'var(--theme-elevation-400)', marginTop: 8 }}>
            Hiển thị tối đa {MAX_RESULTS} kết quả. Gõ để tìm chính xác hơn.
          </p>
        </div>
      )}
    </div>
  )
}
