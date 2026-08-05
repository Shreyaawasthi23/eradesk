import styles from '../dashboard.module.scss'

const ChartCard = ({ title, subtitle, controls, children, bodyStyle, variant }) => {
  return (
    <div className={variant === 'dark' ? styles.cardDark : styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>{title}</h3>
          {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
        </div>
        {controls && <div className={styles.cardControls}>{controls}</div>}
      </div>
      <div className={styles.cardBody} style={bodyStyle}>
        {children}
      </div>
    </div>
  )
}

export default ChartCard
