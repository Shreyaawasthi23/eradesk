import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './CappedSelect.module.scss'

// Multi-select variant of CappedSelect: same portal/height-capped dropdown,
// but the list stays open across selections and the value is an array.
const MultiSelect = ({
  name,
  value,
  onChange,
  onBlur,
  options,
  placeholder = 'Select',
  className,
  maxVisible = 6,
  disabled,
}) => {
  const [open, setOpen] = useState(false)
  const [listPos, setListPos] = useState({ top: 0, left: 0, width: 0 })
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)

  const selectedValues = Array.isArray(value) ? value.map(String) : []

  useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setListPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    updatePosition()

    const handleClickOutside = (e) => {
      const insideTrigger = rootRef.current && rootRef.current.contains(e.target)
      const insideList = listRef.current && listRef.current.contains(e.target)
      if (!insideTrigger && !insideList) {
        setOpen(false)
        onBlur && onBlur({ target: { name } })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, name, onBlur])

  const toggleOption = (option) => {
    const optionValue = String(option.value)
    const next = selectedValues.includes(optionValue)
      ? selectedValues.filter((v) => v !== optionValue)
      : [...selectedValues, optionValue]
    onChange({ target: { name, value: next } })
  }

  const selectedLabels = options
    .filter((o) => selectedValues.includes(String(o.value)))
    .map((o) => o.label)

  const rowHeight = 36
  const maxHeight = rowHeight * maxVisible

  return (
    <div className={`${styles.root} ${className || ''}`} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selectedLabels.length ? styles.value : styles.placeholder}>
          {selectedLabels.length ? selectedLabels.join(', ') : placeholder}
        </span>
        <span className={styles.chevron} aria-hidden="true" />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <ul
            ref={listRef}
            className={styles.list}
            role="listbox"
            aria-multiselectable="true"
            style={{
              position: 'fixed',
              top: listPos.top,
              left: listPos.left,
              width: listPos.width,
              maxHeight,
            }}
          >
            {options.map((option) => {
              const isSelected = selectedValues.includes(String(option.value))
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  className={isSelected ? styles.optionActive : styles.option}
                  onClick={() => toggleOption(option)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    style={{ marginRight: 8, pointerEvents: 'none' }}
                  />
                  {option.label}
                </li>
              )
            })}
          </ul>,
          document.body,
        )}
    </div>
  )
}

export default MultiSelect
