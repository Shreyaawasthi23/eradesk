import React, { useEffect, useState } from 'react'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'

const priorityColor = { HIGH: '#dc2626', NORMAL: '#0f766e', LOW: '#64748b' }

// Drop-in banner showing currently-active announcements — designed to sit at the top of the
// dashboard or portal home. Self-contained (fetches its own data), renders nothing if there's
// nothing active, so it's safe to add without touching the page it's dropped into.
const AnnouncementBanner = () => {
  const details = getUserDetails()
  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    if (!details?.token) return
    const headers = new Headers()
    headers.append('X-Tenant', '' + tenant + '')
    headers.append('Authorization', 'Bearer ' + details?.token + '')
    fetch(apiUrl + '/auth/ops/announcement/get-active', { method: 'GET', headers, redirect: 'follow' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAnnouncements(Array.isArray(data) ? data : []))
      .catch(() => setAnnouncements([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (announcements.length === 0) return null

  return (
    <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {announcements.map((a) => (
        <div
          key={a.id}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            background: `${priorityColor[a.priority] || '#0f766e'}14`,
            borderLeft: `4px solid ${priorityColor[a.priority] || '#0f766e'}`,
            fontSize: 13,
          }}
        >
          <strong>{a.title}</strong>
          {a.description && <span> — {a.description}</span>}
        </div>
      ))}
    </div>
  )
}

export default AnnouncementBanner
