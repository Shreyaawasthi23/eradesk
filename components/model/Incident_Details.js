/* eslint-disable react/prop-types */
import {
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import React from 'react'

// eslint-disable-next-line react/prop-types
const Incident_Details = ({ visible, setVisible, details, ...props }) => {
  //   console.log(details)
  return (
    <CModal
      size="xl"
      alignment="center"
      visible={visible}
      onClose={() => setVisible(false)}
      backdrop="static"
      scrollable
    >
      <CModalHeader>
        <CModalTitle>Incident - #{details.incidentId}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CForm className="row g-3">
          <CCol md={6}>
            <CFormInput
              type="text"
              label="Serial No."
              name="serialNumber"
              value={details.serialNumber}
              disabled
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              type="text"
              label="Date"
              name="incidentDate"
              value={details.incidentDate}
              disabled
            />
          </CCol>
          <CCol md={6}>
            <CFormInput type="text" label="Make" name="make" value={details.make} disabled />
          </CCol>
          <CCol md={6}>
            <CFormInput type="text" label="Model" name="model" value={details.model} disabled />
          </CCol>
          <CCol md={6}>
            <CFormSelect
              aria-label="Priority"
              label="Priority"
              name="priority"
              value={details.priority}
              disabled
            >
              <option>Select</option>
              <option value={1}>P1</option>
              <option value={2}>P2</option>
              <option value={3}>P3</option>
              <option value={4}>P4</option>
              <option value={5}>P5</option>
            </CFormSelect>
          </CCol>
          <CCol md={6}>
            <CFormInput
              type="text"
              label="Problem"
              name="problem"
              value={details.problem}
              disabled
            />
          </CCol>
          <CCol md={6}>
            <CFormSelect
              aria-label="AMC Scope"
              label="AMC Scope"
              name="amcScope"
              value={details.amcScope}
              disabled
            >
              <option>Select</option>
              <option value={'NON-AMC'}>NON-AMC</option>
              <option value={'PRE-AMC'}>PRE-AMC</option>
              <option value={'UNDER-AMC'}>UNDER-AMC</option>
            </CFormSelect>
          </CCol>
          <CCol md={6}>
            <CFormSelect
              aria-label="Asset Type"
              label="Asset type"
              name="assetType"
              value={details.assetType}
              disabled
            >
              <option>Select</option>
              <option value={'Network'}>Network</option>
              <option value={'Security'}>Security</option>
              <option value={'Storage'}>Storage</option>
              <option value={'Unix'}>Unix</option>
              <option value={'Server-x86'}>Server-x86</option>
              <option value={'Wintel'}>Wintel</option>
              <option value={'End-User'}>End-User</option>
              <option value={'AV'}>AV</option>
              <option value={'Other'}>Other</option>
            </CFormSelect>
          </CCol>
          <CCol md={6}>
            <CFormSelect
              aria-label="Engineer"
              label="Engineer"
              name="engineer"
              value={details.engineer}
              disabled
            >
              <option>Select</option>
              <option value={'Sample Engineer'}>Sample Engineer</option>
              {/* {locationList?.map((element, index) => (
                <option key={element.id} value={element.id}>
                  {element.fullAddress}
                </option>
              ))} */}
            </CFormSelect>
          </CCol>
          <CCol md={6}>
            <CFormSelect
              aria-label="PO type"
              label="PO Type"
              name="poType"
              value={details.poType}
              disabled
            >
              <option>Select</option>
              <option value={'Skill'}>Skill</option>
              <option value={'Spare'}>Spare</option>
            </CFormSelect>
          </CCol>
          <CCol md={6}>
            <CFormInput
              type="text"
              label="Contact Name"
              name="contactName"
              value={details.contactName}
              disabled
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              type="email"
              label="Contact Email"
              name="contactEmail"
              value={details.contactEmail}
              disabled
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              type="text"
              label="Contact Number"
              name="contactNumber"
              value={details.contactNumber}
              disabled
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              type="text"
              label="Pincode"
              name="pinCode"
              value={details.pinCode}
              disabled
            />
          </CCol>
          <CCol md={6}>
            <CFormInput type="text" label="City" name="city" value={details.city} disabled />
          </CCol>
          <CCol md={6}>
            <CFormInput type="text" label="State" name="state" value={details.state} disabled />
          </CCol>
          <CCol md={6}>
            <CFormInput
              type="text"
              label="Address"
              name="fullAddress"
              value={details.fullAddress}
              disabled
            />
          </CCol>
          <CCol md={6}>
            <CFormInput type="text" label="SLA" name="sla" value={details.sla} disabled />
          </CCol>
          <CCol md={6}>
            <CFormInput
              type="text"
              label="PO Number"
              name="payOrderNumber"
              value={details.payOrderNumber}
              disabled
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              type="text"
              label="Front Client"
              name="frontClientName"
              value={details.frontClientName}
              disabled
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              type="text"
              label="End Client"
              name="endClientName"
              value={details.endClientName}
              disabled
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              type="text"
              label="Created By"
              name="userEmail"
              value={details.userEmail}
              disabled
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              type="text"
              label="Created Date"
              name="createDate"
              value={details.createDate}
              disabled
            />
          </CCol>
        </CForm>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={() => setVisible(false)}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default Incident_Details
