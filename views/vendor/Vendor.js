import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { createVendor, editVendor } from '@/api/vendor_api'
import Pagination from '@/components/ui/Pagination'
import VendorModal from './VendorModal'
import styles from '../itil/itil.module.scss'

const Vendor = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [vendors, setVendors] = useState({})
  const [currentPage, setCurrentPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [editVendorRow, setEditVendorRow] = useState(null)

  const canManage =
    details?.roles?.includes('ROLE_ADMIN') ||
    details?.roles?.includes('ROLE_USER') ||
    details?.roles?.includes('ROLE_MODERATOR')

  const getAll = async (page, size) => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/service/vendor/get-all-page?page=' + page + '&size=' + size, {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setVendors(data)
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }

  const gotToPage = (pageNo) => {
    getAll(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const handleCreate = (values) => {
    createVendor(values, router, () => {
      setShowCreate(false)
      getAll(0, 10)
    })
  }

  const handleEdit = (values) => {
    editVendor({ ...values, id: editVendorRow.id }, router, () => {
      setEditVendorRow(null)
      getAll(currentPage, 10)
    })
  }

  useEffect(() => {
    getAll(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Vendors</h1>
          <p className={styles.pageSubtitle}>Vendor contacts and relationships</p>
        </div>
        {canManage && (
          <button type="button" className={styles.addBtn} onClick={() => setShowCreate(true)}>
            + New Vendor
          </button>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Name</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                {canManage && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {vendors.content?.map((v) => (
                <tr key={v.id}>
                  <td className={styles.email}>{v.vendorId}</td>
                  <td>{v.name}</td>
                  <td className={styles.email}>{v.contactPerson || '—'}</td>
                  <td className={styles.email}>
                    {v.email ? <a href={`mailto:${v.email}`}>{v.email}</a> : '—'}
                  </td>
                  <td className={styles.email}>{v.phone ? <a href={`tel:${v.phone}`}>{v.phone}</a> : '—'}</td>
                  <td>
                    <span className={v.status ? styles.statusSuccess : styles.statusNeutral}>
                      {v.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canManage && (
                    <td>
                      <button type="button" className={styles.editBtn} onClick={() => setEditVendorRow(v)}>
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {vendors.content?.length === 0 && <div className={styles.emptyState}>No vendors found</div>}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={vendors.totalPages}
          onPageChange={gotToPage}
          variant="styled"
          styles={styles}
        />
      </div>

      {showCreate && (
        <VendorModal title="New Vendor" submitLabel="Create" onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
      )}
      {editVendorRow && (
        <VendorModal
          title="Edit Vendor"
          submitLabel="Save"
          initialValues={editVendorRow}
          onClose={() => setEditVendorRow(null)}
          onSubmit={handleEdit}
        />
      )}
    </div>
  )
}

export default Vendor
