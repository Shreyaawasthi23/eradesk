import styles from '../dashboard.module.scss'

// Single row of year pills, tracking the two most recently clicked years.
// - clicking a new (unselected) year makes it primary; the previous primary
//   slides down to become the compare year
// - clicking the current compare year promotes it to primary (swap)
// - clicking the current primary year deselects it, promoting compare (if any)
// Any two years can be freely picked -- nothing is pinned.
const YearSelect = ({ availableYears, poYear, setPoYear, poCompareYear, setPoCompareYear }) => {
  const handleClick = (y) => {
    if (y === poYear) {
      if (poCompareYear != null) {
        setPoYear(poCompareYear)
        setPoCompareYear(null)
      }
      return
    }
    if (y === poCompareYear) {
      setPoCompareYear(poYear)
      setPoYear(y)
      return
    }
    // new year: becomes primary, old primary slides down to compare
    setPoCompareYear(poYear)
    setPoYear(y)
  }

  return (
    <div className={styles.yearPillRow}>
      {availableYears.map((y) => {
        const isPrimary = y === poYear
        const isCompare = y === poCompareYear
        const className = isPrimary
          ? styles.yearPillActive
          : isCompare
            ? styles.yearPillActiveCompare
            : styles.yearPill
        return (
          <button key={y} type="button" className={className} onClick={() => handleClick(y)}>
            {y}
          </button>
        )
      })}
    </div>
  )
}

export default YearSelect
