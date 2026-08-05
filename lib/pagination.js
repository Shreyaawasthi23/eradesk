// Mirrors Spring Data's Page<T> JSON shape (PageableExecutionUtils.getPage / PageImpl).
export function toPageResponse(content, totalElements, page, size) {
  const totalPages = Math.ceil(totalElements / size) || 0
  return {
    content,
    totalElements,
    totalPages,
    number: page,
    size,
    numberOfElements: content.length,
    first: page === 0,
    last: page >= totalPages - 1,
    empty: content.length === 0,
  }
}
