import CIcon from '@coreui/icons-react'
import { cilArrowTop, cilArrowBottom } from '@coreui/icons'
import styles from '../dashboard.module.scss'

// trend: positive number = up (good), negative = down, undefined = no comparison available
const KpiCard = ({ label, value, trend, icon }) => {
  const hasTrend = typeof trend === 'number' && !Number.isNaN(trend)

  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiTopRow}>
        <div className={styles.kpiLabel}>{label}</div>
        {icon && (
          <div className={styles.kpiIcon}>
            <CIcon icon={icon} size="sm" />
          </div>
        )}
      </div>
      <div className={styles.kpiValueRow}>
        <span className={styles.kpiValue}>{value}</span>
        {hasTrend && (
          <span className={trend >= 0 ? styles.kpiTrendUp : styles.kpiTrendDown}>
            <CIcon icon={trend >= 0 ? cilArrowTop : cilArrowBottom} size="sm" />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  )
}

export default KpiCard
