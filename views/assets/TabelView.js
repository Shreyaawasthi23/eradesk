/* eslint-disable react/prop-types */
import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CFormInput,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

// const EditableCell = ({ value, onChange }) => {
//   const handleChange = (e) => {
//     onChange(e.target.value)
//   }

//   return <CFormInput type="text" value={value} onChange={handleChange} />
// }

// EditableCell.propTypes = {
//   value: PropTypes.string.isRequired,
//   onChange: PropTypes.func.isRequired,
// }
const TableView = ({ jsonData }) => {
  //   const [editableData, setEditableData] = useState(jsonData)

  //   const handleCellChange = (rowIndex, columnIndex, value) => {
  //     setEditableData((prevData) => {
  //       const newData = [...prevData]
  //       newData[rowIndex][columnIndex] = value
  //       return newData
  //     })
  //   }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Table View (Editable):</strong>
          </CCardHeader>
          <CCardBody>
            <CTable bordered hover small>
              <CTableHead>
                <CTableRow>
                  {Object.keys(jsonData[0]).map((header, index) => (
                    <CTableHeaderCell scope="col" key={index}>
                      {header}
                    </CTableHeaderCell>
                  ))}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {jsonData.map((row, rowIndex) => (
                  <CTableRow key={rowIndex}>
                    {Object.entries(row).map(([key, value], columnIndex) => (
                      <CTableDataCell key={columnIndex}>{value}</CTableDataCell>
                    ))}
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

TableView.propTypes = {
  jsonData: PropTypes.array.isRequired,
}

export default TableView
