import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import TableView from './TabelView'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'

import styles from './assets.module.scss'

const UploadAssetsModal = ({ onClose, onUploaded }) => {
  const [jsonData, setJsonData] = useState(null)
  const [view, setView] = useState('table')
  const [isLoading, setIsLoading] = useState(false)
  const [submitBtn, setSubmitBtn] = useState(false)
  const details = getUserDetails()
  const router = useRouter()

  const handleFileDrop = (acceptedFiles) => {
    setIsLoading(true)
    const fileReader = new FileReader()

    fileReader.onload = (e) => {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })

      const worksheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[worksheetName]
      const excelData = XLSX.utils.sheet_to_json(worksheet)

      const headers = Object.keys(excelData[0] || {})

      const mappedData = excelData.map((row) => {
        const obj = {}
        headers.forEach((header) => {
          obj[header] = row[header]
        })
        return obj
      })

      setJsonData(mappedData)
      setIsLoading(false)
    }

    fileReader.onerror = (error) => {
      console.error('FileReader error:', error)
      setIsLoading(false)
    }

    fileReader.readAsArrayBuffer(acceptedFiles[0])
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: handleFileDrop })

  const submitData = () => {
    setSubmitBtn(true)
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Content-Type', 'application/json')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var raw = JSON.stringify(jsonData)

    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/assets/upload-assets?userId=' + details?.id, requestOptions)
      .then((response) => response.json())
      .then((result) => {
        setSubmitBtn(false)
        if (result.statusCode === 200) {
          Swal.fire('Great!', '' + result.message + '', 'success').then(() => {
            onUploaded && onUploaded()
            onClose()
          })
        } else {
          Swal.fire('Oops!', '' + result.message + '', 'warning')
        }
      })
      .catch((error) => {
        console.log('error', error)
        setSubmitBtn(false)
      })
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Upload Assets Excel</h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>
          <div
            {...getRootProps()}
            style={{
              padding: '24px',
              borderRadius: '10px',
              border: '1px dashed var(--fc-border)',
              background: isDragActive ? 'var(--fc-bg)' : 'var(--fc-surface)',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: jsonData ? '16px' : 0,
            }}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p style={{ margin: 0 }}>Drop the Excel file here...</p>
            ) : (
              <p style={{ margin: 0 }}>Drag and drop the Excel file here, or click to select a file</p>
            )}
          </div>

          {jsonData && (
            <div>
              {isLoading ? (
                <div>Loading...</div>
              ) : (
                <div style={{ maxHeight: '40vh', overflow: 'auto' }}>
                  <TableView jsonData={jsonData} view={view} />
                </div>
              )}
            </div>
          )}
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            disabled={!jsonData || submitBtn}
            onClick={submitData}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}

export default UploadAssetsModal
