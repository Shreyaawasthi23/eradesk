import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { CBadge, CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem, CDropdownHeader } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBell } from '@coreui/icons'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'

const POLL_INTERVAL_MS = 30000

const NotificationBell = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const pollRef = useRef(null)

  const authHeaders = () => {
    const headers = new Headers()
    headers.append('X-Tenant', '' + tenant + '')
    headers.append('Authorization', 'Bearer ' + details?.token + '')
    return headers
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(apiUrl + '/auth/notification/unread-count', {
        method: 'GET',
        headers: authHeaders(),
        redirect: 'follow',
      })
      if (!response.ok) return
      const data = await response.json()
      setUnreadCount(data.count || 0)
    } catch {
      // Silent: a failed poll shouldn't disrupt the rest of the app.
    }
  }

  const fetchList = async () => {
    try {
      const response = await fetch(apiUrl + '/auth/notification/get-all-page?page=0&size=10', {
        method: 'GET',
        headers: authHeaders(),
        redirect: 'follow',
      })
      if (!response.ok) return
      const data = await response.json()
      setItems(data.content || [])
    } catch {
      // Silent
    }
  }

  const openNotification = async (n) => {
    if (!n.read) {
      try {
        await fetch(apiUrl + '/auth/notification/mark-read?id=' + n.id, {
          method: 'POST',
          headers: authHeaders(),
          redirect: 'follow',
        })
        fetchUnreadCount()
      } catch {
        // Silent
      }
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  const markAllRead = async (e) => {
    e.stopPropagation()
    try {
      await fetch(apiUrl + '/auth/notification/mark-all-read', {
        method: 'POST',
        headers: authHeaders(),
        redirect: 'follow',
      })
      fetchUnreadCount()
      fetchList()
    } catch {
      // Silent
    }
  }

  useEffect(() => {
    if (!details?.token) return
    fetchUnreadCount()
    pollRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL_MS)
    return () => clearInterval(pollRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!details?.token) return null

  return (
    <CDropdown
      variant="nav-item"
      visible={open}
      onShow={() => {
        setOpen(true)
        fetchList()
      }}
      onHide={() => setOpen(false)}
    >
      <CDropdownToggle
        caret={false}
        className="app-header-icon-btn"
        title="Notifications"
        style={{ position: 'relative' }}
      >
        <CIcon icon={cilBell} />
        {unreadCount > 0 && (
          <CBadge
            color="danger"
            shape="rounded-pill"
            style={{ position: 'absolute', top: 2, right: 2, fontSize: 10 }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </CBadge>
        )}
      </CDropdownToggle>
      <CDropdownMenu placement="bottom-end" style={{ minWidth: 320, maxHeight: 420, overflowY: 'auto' }}>
        <CDropdownHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              style={{ border: 'none', background: 'none', color: '#115f98', fontSize: 12, cursor: 'pointer' }}
            >
              Mark all read
            </button>
          )}
        </CDropdownHeader>
        {items.length === 0 && (
          <div style={{ padding: '16px', color: '#64748b', fontSize: 13, textAlign: 'center' }}>
            No notifications
          </div>
        )}
        {items.map((n) => (
          <CDropdownItem
            key={n.id}
            onClick={() => openNotification(n)}
            style={{
              whiteSpace: 'normal',
              background: n.read ? 'transparent' : 'rgba(17,95,152,0.06)',
              borderBottom: '1px solid #eee',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: n.read ? 400 : 700, fontSize: 13 }}>{n.title}</div>
            {n.message && <div style={{ fontSize: 12, color: '#64748b' }}>{n.message}</div>}
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(n.createDate).toLocaleString()}</div>
          </CDropdownItem>
        ))}
      </CDropdownMenu>
    </CDropdown>
  )
}

export default NotificationBell
