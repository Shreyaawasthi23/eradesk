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
  const [listPos, setListPos] = useState({ top: 0, left: 0, width: 0, maxWidth: 320 })
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const naturalWidth = listRef.current ? listRef.current.scrollWidth : rect.width
      // Cap how much wider than the trigger the list is allowed to get, so
      // it stays visually attached to the field instead of drifting far to
      // the left for very long option labels.
      const maxGrowth = 90
      const desiredWidth = Math.min(Math.max(rect.width, naturalWidth), rect.width + maxGrowth, 320)
      // Extra width over a narrow trigger grows to the left only, so the
      // right edge stays flush with the trigger's right edge and never
      // spills onto content sitting beside it (e.g. Quick Actions icons).
      // Nudged slightly right of that flush point so the list doesn't lean
      // too far left of the field it belongs to.
      const rightShift = 20
      let left = rect.right - desiredWidth + rightShift
      left = Math.max(12, left)
      if (left + desiredWidth > viewportWidth - 12) {
        left = Math.max(12, viewportWidth - 12 - desiredWidth)
      }
      setListPos({
        top: rect.bottom + 4,
        left,
        width: rect.width,
        maxWidth: Math.min(320, viewportWidth - 24),
      })
    }
    updatePosition()
    // Run again after the list has actually painted so scrollWidth reflects
    // real option text, then reposition/flip if it now overflows.
    const raf = requestAnimationFrame(updatePosition)

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
      cancelAnimationFrame(raf)
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
        <span
          className={selected ? styles.value : styles.placeholder}
          title={selected ? selected.label : undefined}
        >
          {selected ? selected.label : placeholder}
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
            style={{
              position: 'fixed',
              top: listPos.top,
              left: listPos.left,
              minWidth: listPos.width,
              maxWidth: listPos.maxWidth,
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
