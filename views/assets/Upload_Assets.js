import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'
import TableView from './TabelView'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import Swal from 'sweetalert2'
import { useRouter } from 'next/router'
import { CButton } from '@coreui/react'

const TabView = ({ jsonData }) => {
  return (
    <div>
      <h4>JSON Data:</h4>
      <pre>{JSON.stringify(jsonData, null, 2)}</pre>
    </div>
  )
}

TabView.propTypes = {
  jsonData: PropTypes.array.isRequired,
}

const Upload_Assets = () => {
  const [jsonData, setJsonData] = useState(null)
  const [view, setView] = useState('json')
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

      const headers = Object.keys(excelData[0])

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

  const handleViewSwitch = (view) => {
    if (view === 'table') {
      setView('table')
      setIsLoading(true) // Start loading when switching to table view
      // Simulate an asynchronous operation (e.g., API call) that takes some time to fetch data
      setTimeout(() => {
        setIsLoading(false)
      }, 1000)
    } else {
      setView('json')
    }
  }

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

    fetch(apiUrl + '/auth/core/assets/upload-assets?userId=' + details?.id, requestOptions)
      .then((response) => response.json())
      .then((result) => {
        if (result.statusCode === 200) {
          setSubmitBtn(false)
          Swal.fire({
            title: result.message,
            text: 'Great you may add more assets',
            icon: 'success',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ok',
          }).then((result) => {
            if (result.isConfirmed) {
              router.push('/add-assets')
            } else {
              router.push('/add-assets')
            }
          })
        } else {
          Swal.fire('Oops!', '' + result.message + '', 'warning')
          setSubmitBtn(false)
        }
      })
      .catch((error) => {
        console.log('error', error)
        setSubmitBtn(false)
      })
  }

  return (
    <div>
      <div
        {...getRootProps()}
        style={{
          padding: '20px',
          border: '1px dashed #ccc',
          background: isDragActive ? '#eee' : '#fff',
          'margin-bottom': '10px',
        }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the Excel file here...</p>
        ) : (
          <p>Drag and drop the Excel file here, or click to select a file</p>
        )}
      </div>

      {jsonData && (
        <div>
          <CButton onClick={() => handleViewSwitch('json')} disabled={view === 'json'} size="sm">
            JSON View
          </CButton>
          {'  '}
          <CButton onClick={() => handleViewSwitch('table')} disabled={view === 'table'} size="sm">
            Table View
          </CButton>
          {'  '}
          <CButton onClick={() => submitData()} disabled={submitBtn} size="sm">
            Submit
          </CButton>
          {isLoading ? (
            <div>Loading...</div> // Display the loading indicator while processing the data for the table view
          ) : (
            <div>
              {view === 'json' && <TabView jsonData={jsonData} />}{' '}
              {/* Pass the jsonData to the TabView component */}
              {view === 'table' && <TableView jsonData={jsonData} view="table" />}{' '}
              {/* Pass the jsonData to the TableView component */}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Upload_Assets
