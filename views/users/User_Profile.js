import { useEffect, useState } from 'react'
import { getUserDetails } from '@/lib/auth'
import styles from './profile.module.scss'

const initials = (name) => (name ? name.charAt(0).toUpperCase() : '?')

const User_Profile = () => {
  const [details, setDetails] = useState(null)

  useEffect(() => {
    setDetails(getUserDetails())
  }, [])

  const fullName = `${details?.firstName || ''} ${details?.lastName || ''}`.trim()
  const primaryRole = details?.roles?.[0]?.replace('ROLE_', '') || 'User'

  return (
    <div className={styles.page}>
      <div className={styles.heroCard}>
        <div className={styles.heroAvatar}>{initials(details?.firstName)}</div>
        <div>
          <h1 className={styles.heroName}>{fullName || 'My Profile'}</h1>
          <p className={styles.heroMeta}>
            <span className={styles.roleBadge}>{primaryRole}</span>
            {details?.email}
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Personal Information</h2>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.infoGrid}>
            <div className={styles.infoField}>
              <span className={styles.infoLabel}>First Name</span>
              <span className={styles.infoValue}>{details?.firstName || '-'}</span>
            </div>
            <div className={styles.infoField}>
              <span className={styles.infoLabel}>Last Name</span>
              <span className={styles.infoValue}>{details?.lastName || '-'}</span>
            </div>
            <div className={styles.infoField}>
              <span className={styles.infoLabel}>Email Address</span>
              <span className={styles.infoValue}>{details?.email || '-'}</span>
            </div>
            <div className={styles.infoField}>
              <span className={styles.infoLabel}>Roles</span>
              <span className={styles.infoValue}>
                {details?.roles?.map((r) => r.replace('ROLE_', '')).join(', ') || '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default User_Profile
