import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { createCatalogItem, submitServiceRequest, setServiceRequestStatus } from '@/api/catalog_api'
import CatalogItemModal from './CatalogItemModal'
import RequestFormModal from './RequestFormModal'
import styles from '../itil/itil.module.scss'

const statusClass = {
  PENDING_APPROVAL: 'statusWarning',
  OPEN: 'statusInfo',
  IN_PROGRESS: 'statusWarning',
  RESOLVED: 'statusSuccess',
  CLOSED: 'statusSuccess',
  REJECTED: 'statusDanger',
  CANCELLED: 'statusNeutral',
}

const ServiceCatalog = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [tab, setTab] = useState('catalog')
  const [items, setItems] = useState({})
  const [myRequests, setMyRequests] = useState({})
  const [engineerList, setEngineerList] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [requestingItem, setRequestingItem] = useState(null)

  const canManage = details?.roles?.includes('ROLE_ADMIN') || details?.roles?.includes('ROLE_MODERATOR')

  const authFetch = (path) => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    return fetch(apiUrl + path, { method: 'GET', headers: myHeaders, redirect: 'follow' })
  }

  const getItems = async () => {
    const r = await authFetch('/auth/catalog/get-all-page?page=0&size=50&activeOnly=true')
    if (r.status === 401) return router.push('/')
    setItems(await r.json())
  }

  const getMyRequests = async () => {
    const r = await authFetch('/auth/catalog/request-get-all-page?page=0&size=50&mine=true')
    if (r.status === 401) return router.push('/')
    setMyRequests(await r.json())
  }

  const getEngineers = async () => {
    const r = await authFetch('/auth/users/get-engineers')
    if (r.ok) setEngineerList(await r.json())
  }

  const handleCreate = (values) => {
    createCatalogItem(values, router, () => {
      setShowCreate(false)
      getItems()
    })
  }

  const handleRequestSubmit = (payload) => {
    submitServiceRequest(payload, router, () => {
      setRequestingItem(null)
      getMyRequests()
      setTab('mine')
    })
  }

  const cancelRequest = (id) => {
    setServiceRequestStatus(id, 'CANCELLED', {}, router, getMyRequests)
  }

  useEffect(() => {
    getItems()
    getMyRequests()
    getEngineers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Service Catalog</h1>
          <p className={styles.pageSubtitle}>Request pre-defined services and track your requests</p>
        </div>
        {canManage && tab === 'catalog' && (
          <button type="button" className={styles.addBtn} onClick={() => setShowCreate(true)}>
            + New Catalog Item
          </button>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <button type="button" className={tab === 'catalog' ? styles.applyBtn : styles.filterClear} onClick={() => setTab('catalog')}>
            Browse Catalog
          </button>
          <button type="button" className={tab === 'mine' ? styles.applyBtn : styles.filterClear} onClick={() => setTab('mine')}>
            My Requests ({myRequests.content?.length || 0})
          </button>
        </div>

        {tab === 'catalog' && (
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {items.content?.map((item) => (
              <div key={item.id} className={styles.timelineItem}>
                <div className={styles.timelineHead}>
                  <span>{item.name}</span>
                  <span className={styles.typeBadge}>{item.category}</span>
                </div>
                {item.description && <p className={styles.timelineMeta}>{item.description}</p>}
                <div className={styles.email} style={{ marginBottom: 8 }}>
                  SLA: {item.slaHours}h {item.approvalRequired && '· Requires approval'}
                </div>
                <button type="button" className={styles.actionBtn} onClick={() => setRequestingItem(item)}>
                  Request
                </button>
              </div>
            ))}
            {items.content?.length === 0 && <div className={styles.emptyState}>No catalog items available</div>}
          </div>
        )}

        {tab === 'mine' && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.content?.map((r) => (
                  <tr key={r.id}>
                    <td className={styles.email}>{r.requestId}</td>
                    <td>{r.catalogItemName}</td>
                    <td>
                      <span className={styles[statusClass[r.status] || 'statusNeutral']}>{r.status.replace('_', ' ')}</span>
                    </td>
                    <td className={styles.email}>{new Date(r.createDate).toLocaleDateString()}</td>
                    <td>
                      {['PENDING_APPROVAL', 'OPEN'].includes(r.status) && (
                        <button type="button" className={styles.editBtn} onClick={() => cancelRequest(r.id)}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {myRequests.content?.length === 0 && <div className={styles.emptyState}>You haven&apos;t submitted any requests</div>}
          </div>
        )}
      </div>

      {showCreate && (
        <CatalogItemModal engineerList={engineerList} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
      )}
      {requestingItem && (
        <RequestFormModal item={requestingItem} onClose={() => setRequestingItem(null)} onSubmit={handleRequestSubmit} />
      )}
    </div>
  )
}

export default ServiceCatalog
