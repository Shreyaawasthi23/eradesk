import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './CappedSelect.module.scss'

// A <select>-like dropdown whose open list is height-capped with its own
// scrollbar, instead of a native <select> popup which can't be capped
// cross-browser and ends up rendering long lists past the form/modal.
// The list is rendered into a portal with fixed positioning so it isn't
// clipped by scrollable/overflow:hidden ancestors (tables, modals, etc).
const CappedSelect = ({
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

  const selected = options.find((o) => String(o.value) === String(value))

  const selectOption = (option) => {
    onChange({ target: { name, value: option.value } })
    setOpen(false)
  }

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
        <span className={selected ? styles.value : styles.placeholder}>
          {selected ? selected.label : placeholder}
        </span>
        <span className={styles.chevron} aria-hidden="true">
          &#9662;
        </span>
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <ul
            ref={listRef}
            className={styles.list}
            role="listbox"
            style={{
              position: 'fixed',
              top: listPos.top,
              left: listPos.left,
              width: listPos.width,
              maxHeight,
            }}
          >
            {options.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={String(option.value) === String(value)}
                className={
                  String(option.value) === String(value) ? styles.optionActive : styles.option
                }
                onClick={() => selectOption(option)}
              >
                {option.label}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  )
}

export default CappedSelect
