import styles from '../dashboard.module.scss'

// Single pill row for picking one year (no compare year).
const SingleYearSelect = ({ availableYears, year, setYear }) => {
  return (
    <div className={styles.yearPillRow}>
      {availableYears.map((y) => (
        <button
          key={y}
          type="button"
          className={y === year ? styles.yearPillActive : styles.yearPill}
          onClick={() => setYear(y)}
        >
          {y}
        </button>
      ))}
    </div>
  )
}

export default SingleYearSelect
