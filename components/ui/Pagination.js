import React from 'react'
import { CPagination, CPaginationItem } from '@coreui/react'

// Shared sliding-window pagination: shows Previous, a window of `windowSize`
// page numbers centered on the current page, the last page (so users can see
// the total count even when it's far away), and Next.
const getWindow = (currentPage, totalPages, windowSize) => {
  let start = Math.max(0, currentPage - Math.floor(windowSize / 2))
  let end = Math.min(totalPages, start + windowSize)
  start = Math.max(0, end - windowSize)
  const pages = []
  for (let i = start; i < end; i++) pages.push(i)

  const lastPage = totalPages - 1
  if (pages.length && pages[pages.length - 1] < lastPage) {
    if (pages[pages.length - 1] < lastPage - 1) {
      pages.push('gap')
    }
    pages.push(lastPage)
  }
  return pages
}

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  windowSize = 5,
  variant = 'styled',
  labelOffset = 1,
  styles,
}) => {
  if (!totalPages || totalPages <= 1) return null

  const pages = getWindow(currentPage, totalPages, windowSize)
  const goPrevious = () => currentPage > 0 && onPageChange(currentPage - 1)
  const goNext = () => currentPage < totalPages - 1 && onPageChange(currentPage + 1)

  if (variant === 'coreui') {
    return (
      <CPagination align="center" aria-label="Page navigation">
        <CPaginationItem disabled={currentPage === 0} onClick={goPrevious}>
          Previous
        </CPaginationItem>
        {pages.map((i, idx) =>
          i === 'gap' ? (
            <CPaginationItem key={`gap-${idx}`} disabled>
              …
            </CPaginationItem>
          ) : (
            <CPaginationItem key={i} active={i === currentPage} onClick={() => onPageChange(i)}>
              {i + labelOffset}
            </CPaginationItem>
          ),
        )}
        <CPaginationItem disabled={currentPage === totalPages - 1} onClick={goNext}>
          Next
        </CPaginationItem>
      </CPagination>
    )
  }

  return (
    <div className={styles.pagination}>
      <button type="button" className={styles.pageBtn} onClick={goPrevious} disabled={currentPage === 0}>
        Previous
      </button>
      {pages.map((i, idx) =>
        i === 'gap' ? (
          <span key={`gap-${idx}`} className={styles.pageBtn} style={{ cursor: 'default' }}>
            …
          </span>
        ) : (
          <button
            key={i}
            type="button"
            className={i === currentPage ? styles.pageBtnActive : styles.pageBtn}
            onClick={() => onPageChange(i)}
          >
            {i + labelOffset}
          </button>
        ),
      )}
      <button
        type="button"
        className={styles.pageBtn}
        onClick={goNext}
        disabled={currentPage === totalPages - 1}
      >
        Next
      </button>
    </div>
  )
}

export default Pagination
