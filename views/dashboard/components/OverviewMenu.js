import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import styles from '../dashboard.module.scss'

// Dropdown menu of status links, e.g. -> /incident-status/OPEN
const OverviewMenu = ({ items, hrefBase }) => {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const ref = useRef(null)

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className={styles.menuWrap} ref={ref}>
      <button className={styles.menuTrigger} onClick={() => setOpen((o) => !o)} type="button">
        Overview
      </button>
      {open && (
        <div className={styles.menuList}>
          {items?.map((item, index) => (
            <button
              key={index}
              className={styles.menuItem}
              type="button"
              onClick={() => {
                setOpen(false)
                router.push(hrefBase + item.status)
              }}
            >
              {item.status}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default OverviewMenu
