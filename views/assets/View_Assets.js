import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Swal from 'sweetalert2'
import Lottie from 'react-lottie'
import * as XLSX from 'xlsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes, faEye, faCopy, faPenToSquare } from '@fortawesome/free-solid-svg-icons'
import View_Assets_Support from '@/components/model/View_Assets_Support'
import Add_Replacement from '@/components/model/Add_Replacement'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import loader from '@/assets/lottie/loading.json'
import Pagination from '@/components/ui/Pagination'

import styles from './assets.module.scss'
import EditAssetModal from './EditAssetModal'

const View_Assets = () => {
  const details = getUserDetails()
  const router = useRouter()
  const [assetList, setAssetList] = useState({})
  const [endClientList, setEndClientList] = useState([])
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [editId, setEditId] = useState(null)

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: loader,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  }

  const [assetViewModal, setAssetViewModel] = useState(false)
  const [assetDetails, setAssetDetails] = useState({})

  const [visibilityReplacement, setVisibilityReplacement] = useState(false)
  const [replacementAssetDetails, setReplacementAssetDetails] = useState({})

  // Filters
  const [search, setSearch] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [serialNo, setSerialNo] = useState('')

  const buildFilterQuery = (filters) => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.poNumber) params.set('poNumber', filters.poNumber)
    if (filters.serialNo) params.set('serialNo', filters.serialNo)
    return params.toString()
  }

  const toggleLoader = () => {
    setIsLoading(!isLoading)
  }

  const openIncidentDetail = (item) => {
    setAssetViewModel(true)
    setAssetDetails(item)
  }

  const openAddReplacement = (item) => {
    setVisibilityReplacement(true)
    setReplacementAssetDetails(item)
  }

  const getAllEndClients = () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/end-client/get-all', requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        if (result !== null) {
          setEndClientList(result)
        }
      })
      .catch((error) => console.log('error', error))
  }

  const getAssetList = async (
    page,
    size,
    filters = { search, poNumber, serialNo },
  ) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    const filterQuery = buildFilterQuery(filters)
    const url =
      apiUrl +
      '/auth/assets/get-all-page?page=' +
      page +
      '&size=' +
      size +
      (filterQuery ? '&' + filterQuery : '')

    try {
      const response = await fetch(url, requestOptions)
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setAssetList(data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const applyFilters = () => {
    setCurrentPage(0)
    getAssetList(0, 100)
  }

  const clearFilters = () => {
    setSearch('')
    setPoNumber('')
    setSerialNo('')
    setCurrentPage(0)
    getAssetList(0, 100, { search: '', poNumber: '', serialNo: '' })
  }

  const deleteAsset = async () => {
    Swal.fire({
      title: 'Warning!',
      text: 'Are you sure you want to delete ' + selectedRows.length + ' assets?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes',
    }).then(async (result) => {
      if (result.isConfirmed) {
        var myHeaders = new Headers()
        myHeaders.append('X-Tenant', '' + tenant + '')
        myHeaders.append('Content-Type', 'application/json')
        myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

        var raw = JSON.stringify(selectedRows)

        var requestOptions = {
          method: 'DELETE',
          headers: myHeaders,
          body: raw,
          redirect: 'follow',
        }

        try {
          const response = await fetch(
            apiUrl + '/auth/assets/delete-assets?&userId=' + details?.id,
            requestOptions,
          )
          if (response.status === 401) {
            router.push('/')
          } else {
            const data = await response.json()
            if (data !== null) {
              Swal.fire('Great!', '' + data.message + '', 'success').then(() => {
                getAssetList(0, 100)
                setSelectedRows([])
              })
            }
          }
        } catch (error) {
          console.error('Error fetching data:', error)
        }
      }
    })
  }

  const gotToPage = (pageNo) => {
    getAssetList(pageNo, 100)
    setCurrentPage(pageNo)
  }

  const editAsset = (id) => {
    setEditId(id)
  }

  const downloadAsExcel = () => {
    if (Array.isArray(assetList.content) && assetList.content.length > 0) {
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(assetList.content)
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const excelData = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      const downloadLink = document.createElement('a')
      downloadLink.href = URL.createObjectURL(excelData)
      downloadLink.download = 'Assets Page-' + currentPage + '.xlsx'
      downloadLink.click()
    } else {
      alert('No data to download!')
    }
  }

  useEffect(() => {
    getAllEndClients()
    getAssetList(0, 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      {isLoading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              cursor: 'pointer',
              color: 'white',
            }}
            onClick={toggleLoader}
          >
            <FontAwesomeIcon icon={faTimes} />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <Lottie options={defaultOptions} height={100} width={100} />
          </div>
        </div>
      )}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Assets</h1>
          <p className={styles.pageSubtitle}>Manage assets{selectedRows.length > 0 ? ` · ${selectedRows.length} selected` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {details?.roles?.includes('ROLE_ADMIN') && (
            <button type="button" className={styles.filterClear} onClick={downloadAsExcel}>
              Download
            </button>
          )}
          {details?.roles?.includes('ROLE_ADMIN') && selectedRows.length > 0 && (
            <button type="button" className={styles.filterClear} onClick={deleteAsset}>
              Delete
            </button>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.filterFieldWide}>
            <label className={styles.filterLabel}>Search</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Make or model"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>PO Number</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="PO number"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Serial Number</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Serial number"
              value={serialNo}
              onChange={(e) => setSerialNo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <button type="button" className={styles.applyBtn} onClick={applyFilters}>
            Apply
          </button>
          <button type="button" className={styles.filterClear} onClick={clearFilters}>
            Clear
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      assetList.content?.length > 0 &&
                      selectedRows.length === assetList.content?.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = assetList.content?.map((option) => option.id)
                        setSelectedRows(allIds)
                      } else {
                        setSelectedRows([])
                      }
                    }}
                  />
                </th>
                <th>#</th>
                <th>Serial Number</th>
                <th>Make</th>
                <th>Model</th>
                <th>PO</th>
                <th>Create Date</th>
                <th className={styles.actionHeader}>Action</th>
              </tr>
            </thead>
            <tbody>
              {assetList.content?.map((option, index) => (
                <tr key={option.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(option.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRows([...selectedRows, option.id])
                        } else {
                          setSelectedRows(selectedRows.filter((row) => row !== option.id))
                        }
                      }}
                    />
                  </td>
                  <td style={option.replaced ? { textDecoration: 'line-through' } : null}>
                    {assetList.number * assetList.size + index}
                  </td>
                  <td
                    className={styles.username}
                    style={option.replaced ? { textDecoration: 'line-through' } : null}
                  >
                    {option.serialNumber}
                  </td>
                  <td
                    className={styles.email}
                    style={option.replaced ? { textDecoration: 'line-through' } : null}
                  >
                    {option.make}
                  </td>
                  <td
                    className={styles.email}
                    style={option.replaced ? { textDecoration: 'line-through' } : null}
                  >
                    {option.model}
                  </td>
                  <td
                    className={styles.email}
                    style={option.replaced ? { textDecoration: 'line-through' } : null}
                  >
                    {option.purchaseOrderNumber}
                  </td>
                  <td
                    className={styles.email}
                    style={option.replaced ? { textDecoration: 'line-through' } : null}
                  >
                    {option.createDate}
                  </td>
                  <td className={styles.actionCell}>
                    <div className={styles.iconActionGroup}>
                      <button
                        type="button"
                        className={styles.iconActionView}
                        title="View"
                        onClick={() => openIncidentDetail(option)}
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      {details?.roles?.includes('ROLE_ADMIN') && (
                        <>
                          <button
                            type="button"
                            className={styles.iconActionReplace}
                            title="Replace"
                            disabled={!!option.replaced}
                            onClick={() => openAddReplacement(option)}
                          >
                            <FontAwesomeIcon icon={faCopy} />
                          </button>
                          <button
                            type="button"
                            className={styles.iconActionEdit}
                            title="Edit"
                            onClick={() => editAsset(option.id)}
                          >
                            <FontAwesomeIcon icon={faPenToSquare} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {assetList.content?.length === 0 && (
            <div className={styles.emptyState}>No assets found</div>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={assetList.totalPages}
          onPageChange={gotToPage}
          styles={styles}
        />
      </div>

      <View_Assets_Support
        visible={assetViewModal}
        setVisible={setAssetViewModel}
        details={assetDetails}
      />
      <Add_Replacement
        visible={visibilityReplacement}
        setVisible={setVisibilityReplacement}
        asset={replacementAssetDetails}
        assetList={getAssetList}
      />

      {editId && (
        <EditAssetModal
          assetId={editId}
          router={router}
          endClientList={endClientList}
          onClose={() => setEditId(null)}
          onSaved={() => getAssetList(currentPage, 100)}
        />
      )}
    </div>
  )
}

export default View_Assets
