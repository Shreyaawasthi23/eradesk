import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import React from 'react'
import { useEffect } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import moment from 'moment'
import Mail_View from '@/components/model/Mail_View'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowsRotate, faRotateRight, faTimes } from '@fortawesome/free-solid-svg-icons'
import Swal from 'sweetalert2'
import Lottie from 'react-lottie'
import loader from '@/assets/lottie/loading.json'

const View_Incident = () => {
  const router = useRouter()
  const { id } = router.query
  const details = getUserDetails()
  const [incidentDetails, setIncidentDetails] = useState({})
  const [user, setUser] = useState({})
  // const [formattedDate, setFormattedDate] = useState('')
  // const [formattedTime, setFormattedTime] = useState('')

  const [rma, setRma] = useState([])
  const [age, setAge] = useState('')
  const [note, setNotes] = useState([])
  const [deliveryChallans, setDeliveryChallans] = useState([])

  const [mails, setMails] = useState([])
  const [mailsVisible, setMailsVisible] = useState(false)
  const [mailsBody, setMailsBody] = useState({})

  const [isLoading, setIsLoading] = useState(false)

  const toggleLoader = () => {
    setIsLoading(!isLoading)
  }

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: loader,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice', // Adjusts the aspect ratio to center the animation
    },
  }

  const formatDate = (date) => {
    return moment(date).format('DD/MM/YYYY')
  }

  const formatTime = (date) => {
    return moment(date).format('hh:mm A')
  }

  const calculateAge = (createDate) => {
    const today = moment()
    const dob = moment(createDate)
    const age = today.diff(dob, 'years')

    if (age > 0) {
      return `${age} year${age > 1 ? 's' : ''} ago`
    } else {
      const months = today.diff(dob, 'months')
      if (months > 0) {
        return `${months} month${months > 1 ? 's' : ''} ago`
      } else {
        const days = today.diff(dob, 'days')
        return `${days} day${days > 1 ? 's' : ''} ago`
      }
    }
  }

  const getIncidentDetails = async () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }
    try {
      const response = await fetch(apiUrl + '/auth/core/incident/get-detail?id=' + id, requestOptions)
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setIncidentDetails(data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      // Handle the error (e.g., show an error message, retry the request, etc.)
    }
  }

  const getIncidentNotes = () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/core/incident/get-notes?incidentId=' + id, requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        setNotes(result)
      })
      .catch((error) => console.log('error', error))
  }

  const getIncidentRma = async () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/core/rma/get-incident?incidentId=' + id,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setRma(data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      // Handle the error (e.g., show an error message, retry the request, etc.)
    }
  }

  const getIncidentMails = async () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/account/mail/get-incidentRef?incidentRefId=' + id,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setMails(data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      // Handle the error (e.g., show an error message, retry the request, etc.)
    }
  }

  const getIncidentMailsFromMicrosoft = async () => {
    setIsLoading(true)
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/account/microsoft/fetch-mails?incidentId=' + incidentDetails.incidentId,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setIsLoading(false)
          if (data.statusCode === 200) {
            Swal.fire({
              title: 'Mails are fetched successfully',
              text: data.message,
              icon: 'success',
              showCancelButton: true,
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33',
              confirmButtonText: 'Ok',
            }).then((result) => {
              if (result.isConfirmed) {
                window.location.reload()
              } else {
                window.location.reload()
              }
            })
          } else {
            Swal.fire('Oops!', '' + data.message + '', 'warning')
          }
        }
      }
    } catch (error) {
      setIsLoading(false)
      console.error('Error fetching data:', error)
      // Handle the error (e.g., show an error message, retry the request, etc.)
    }
  }

  const getSLAAndClosingDate = async () => {
    setIsLoading(true)
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/core/incident/check-sla?incidentId=' + id,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setIsLoading(false)
          if (data === true) {
            Swal.fire({
              title: 'SLA Calculated successfully',
              text: data.message,
              icon: 'success',
              showCancelButton: true,
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33',
              confirmButtonText: 'Ok',
            }).then((result) => {
              if (result.isConfirmed) {
                window.location.reload()
              } else {
                window.location.reload()
              }
            })
          } else {
            Swal.fire('Oops!', '' + data.message + '', 'warning')
          }
        }
      }
    } catch (error) {
      setIsLoading(false)
      console.error('Error fetching data:', error)
      // Handle the error (e.g., show an error message, retry the request, etc.)
    }
  }

  const getDeliveryChallabs = async () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/core/challan/by-incident?incidentId=' + id,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setDeliveryChallans(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }

  const getUserDetails2 = async (userId) => {
    // console.log('Inside', userId)
    try {
      const myHeaders = new Headers()
      myHeaders.append('X-Tenant', '' + tenant + '')
      myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

      const requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      }

      const response = await fetch(
        apiUrl + '/api/auth/core/users/get-user-details-general?id=' + userId,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setUser(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }

  const handelMailView = (item) => {
    setMailsBody(item)
    setMailsVisible(true)
  }
  useEffect(() => {
    if (!id) return
    getIncidentDetails()
    getIncidentNotes()
    getIncidentRma()
    getIncidentMails()
    getDeliveryChallabs()
    if (incidentDetails.engineerId !== null) {
      getUserDetails2(incidentDetails.engineerId)
    }
  }, [id, incidentDetails.engineerId])
  return (
    <>
      {isLoading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black background
            zIndex: 9999, // Ensure the loader appears on top of other elements
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
      )}{' '}
      <CRow>
        <CCol xs={9}>
          {/* Main Card */}
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Incident #{incidentDetails.incidentId}</strong>
              <CButton size="sm" className="pull-right" onClick={() => getSLAAndClosingDate()}>
                <FontAwesomeIcon icon={faArrowsRotate} />
              </CButton>{' '}
              <strong className="pull-right" style={{ 'margin-right': '10px' }}>
                Current Owner - {user.email}
              </strong>
            </CCardHeader>
            <CCardBody>
              <CForm className="row g-3">
                <CCol xs={12}>
                  <h3>{incidentDetails.problem}</h3>
                  <ul>
                    <li>
                      Create by <b>{incidentDetails.userEmail}</b> at{' '}
                      <b>{formatTime(incidentDetails.createDate)}</b> on
                      <b>{formatDate(incidentDetails.createDate)}</b>
                    </li>
                    <li>
                      Age - <b>{calculateAge(incidentDetails.createDate)}</b>
                    </li>
                    <li>
                      SLA Time - <b>{incidentDetails.slaTime}</b>
                    </li>
                  </ul>
                </CCol>
              </CForm>
            </CCardBody>
          </CCard>
          {/* RMA Card */}
          <CCard className="mb-4">
            <CCardHeader>
              <strong>RMA Against Incident</strong>
            </CCardHeader>
            <CCardBody>
              <CForm className="row g-3">
                {rma?.map((item) => {
                  return (
                    // eslint-disable-next-line react/jsx-key
                    <CCol xs={12}>
                      <CCardBody className="notes-card">
                        <h5 className="text-primary">#{item.rmaId}</h5>
                        <p style={{ fontSize: '12px' }}>
                          Create by <b>{item.userEmail}</b> at <b>{formatTime(item.createDate)}</b>{' '}
                          on <b>{formatDate(item.createDate)}</b>
                        </p>
                        <p style={{ fontSize: '12px' }}>
                          Current Status is <b>{item.status}</b> serial number of product is{' '}
                          <b>{item.serialNo}</b>, for End-Client <b>{item.endClientName}</b> at{' '}
                          <b>{item.city}</b> for more{' '}
                          <span
                            className="text-danger link"
                            onClick={(e) => router.push('/rma/view/' + item.id)}
                          >
                            details
                          </span>
                          .
                        </p>
                      </CCardBody>
                    </CCol>
                  )
                })}
              </CForm>
            </CCardBody>
          </CCard>
          {/* DC Card */}
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Delivery Challans</strong>
            </CCardHeader>
            <CCardBody>
              <CForm className="row g-3">
                {deliveryChallans?.map((item) => {
                  return (
                    // eslint-disable-next-line react/jsx-key
                    <CCol xs={12}>
                      <CCardBody className="notes-card">
                        <h5 className="text-primary">#{item.challanNo}</h5>
                        <p style={{ fontSize: '12px' }}>
                          Create by <b>{item.userEmail}</b> at <b>{formatTime(item.createDate)}</b>{' '}
                          on <b>{formatDate(item.createDate)}</b>
                        </p>
                        <p style={{ fontSize: '12px' }}>
                          Current Status is <b>{item.status}</b> challan date is{' '}
                          <b>{formatDate(item.date)}</b>, for Purchase Order Number{' '}
                          <b>{item.poNumber}</b> at <b>{item.city}</b> for more{' '}
                          <span
                            className="text-danger link"
                            onClick={(e) => router.push('/edit-challans/' + item.id)}
                          >
                            details
                          </span>
                          .
                        </p>
                      </CCardBody>
                    </CCol>
                  )
                })}
              </CForm>
            </CCardBody>
          </CCard>
          {/* Notes Card */}
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Incident Notes</strong>
            </CCardHeader>
            <CCardBody>
              <CForm className="row g-3">
                {note?.map((item) => {
                  return (
                    // eslint-disable-next-line react/jsx-key
                    <CCol xs={12}>
                      <CCardBody className="notes-card">
                        <h6>{item.note}</h6>
                        {item.additionalDetails ? (
                          <p>
                            <b>Comment - </b>
                            {item.additionalDetails}
                          </p>
                        ) : null}
                        <p style={{ fontSize: '12px' }}>
                          Create by <b>{item.userEmail}</b> at <b>{formatTime(item.createDate)}</b>{' '}
                          on <b>{formatDate(item.createDate)}</b>
                        </p>
                      </CCardBody>
                    </CCol>
                  )
                })}
              </CForm>
            </CCardBody>
          </CCard>
          {/* Mails Card */}
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Incident Mails</strong>

              {details?.roles?.includes('ROLE_ADMIN') ? (
                <CButton
                  size="sm"
                  className="pull-right"
                  onClick={() => getIncidentMailsFromMicrosoft()}
                >
                  <FontAwesomeIcon icon={faArrowsRotate} />
                </CButton>
              ) : null}
            </CCardHeader>
            <CCardBody>
              <CForm className="row g-3">
                {mails?.map((item) => {
                  return (
                    // eslint-disable-next-line react/jsx-key
                    <CCol xs={12}>
                      <CCardBody className="notes-card">
                        <h6>{item.subject}</h6>
                        <p>
                          {item.bodyPreview}
                          {'... '}
                          <span
                            onClick={() => handelMailView(item)}
                            className="link"
                            style={{ color: 'red' }}
                          >
                            View
                          </span>
                        </p>
                        <p style={{ fontSize: '12px' }}>
                          This Mail is fetched at <b>{formatTime(item.createDate)}</b> on{' '}
                          <b>{formatDate(item.createDate)}</b>
                        </p>
                      </CCardBody>
                    </CCol>
                  )
                })}
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
        {/* Right Side Colum */}
        <CCol xs={3}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong></strong>
            </CCardHeader>
            <CCardBody>
              <CForm className="row g-3">
                <CCol md={12}>
                  <span>
                    <b>Status</b>
                  </span>
                  <span className="pull-right">{incidentDetails.status}</span>
                </CCol>
                <CCol md={12}>
                  <span>
                    <b>Priority</b>
                  </span>
                  <span className="pull-right">{incidentDetails.priority}</span>
                </CCol>
                <CCol md={12}>
                  <span>
                    <b>AMC Scope</b>
                  </span>
                  <span className="pull-right">{incidentDetails.amcScope}</span>
                </CCol>
                <CCol md={12}>
                  <span>
                    <b>Asset Type</b>
                  </span>
                  <span className="pull-right">{incidentDetails.assetType}</span>
                </CCol>
                <CCol md={12}>
                  <span>
                    <b>Engineer</b>
                  </span>
                  <span className="pull-right">{incidentDetails.engineer}</span>
                </CCol>
                <CCol md={12}>
                  <span>
                    <b>Closed Date</b>
                  </span>
                  <span className="pull-right">
                    {incidentDetails?.closeDate
                      ? `${formatDate(incidentDetails.closeDate)} ${formatTime(
                          incidentDetails.closeDate,
                        )}`
                      : 'Not closed yet'}
                  </span>
                </CCol>
              </CForm>
            </CCardBody>
          </CCard>
          <CCard className="mb-4">
            <CCardHeader>
              <strong></strong>
            </CCardHeader>
            <CCardBody>
              <CForm className="row g-3">
                <CCol md={12}>
                  <span>
                    <b>Make</b>
                  </span>
                  <span className="pull-right">{incidentDetails.make}</span>
                </CCol>
                <CCol md={12}>
                  <span>
                    <b>Model</b>
                  </span>
                  <span className="pull-right">{incidentDetails.model}</span>
                </CCol>
                <CCol md={12}>
                  <span>
                    <b>Serial</b>
                  </span>
                  <span className="pull-right">{incidentDetails.serialNumber}</span>
                </CCol>
                <CCol md={12}>
                  <span>
                    <b>SLA</b>
                  </span>
                  <span className="pull-right">{incidentDetails.sla}</span>
                </CCol>
              </CForm>
            </CCardBody>
          </CCard>
          <CCard className="mb-4">
            <CCardHeader>
              <strong></strong>
            </CCardHeader>
            <CCardBody>
              <CForm className="row g-3">
                <CCol md={12}>
                  <span>
                    <b>Pay Order</b>
                  </span>
                  <br></br>
                  <span>{incidentDetails.payOrderNumber}</span>
                </CCol>
                <CCol md={12}>
                  <span>
                    <b>Create By</b>
                  </span>
                  <br></br>
                  <span>{incidentDetails.userEmail}</span>
                </CCol>
                <CCol md={12}>
                  <span>
                    <b>Front Client</b>
                  </span>
                  <br></br>
                  <span>{incidentDetails.frontClientName}</span>
                </CCol>
                <CCol md={12}>
                  <span>
                    <b>End Client</b>
                  </span>
                  <br></br>
                  <span>{incidentDetails.endClientName}</span>
                </CCol>
              </CForm>
            </CCardBody>
          </CCard>
          <CCard className="mb-4">
            <CCardHeader>
              <strong></strong>
            </CCardHeader>
            <CCardBody>
              <CForm className="row g-3">
                <CCol md={12}>
                  <span>
                    <b>City</b>
                  </span>
                  <span className="pull-right">{incidentDetails.city}</span>
                </CCol>
                <CCol md={12}>
                  <span>
                    <b>State</b>
                  </span>
                  <span className="pull-right">{incidentDetails.state}</span>
                </CCol>
                <CCol md={12}>
                  <span>
                    <b>Pincode</b>
                  </span>
                  <span className="pull-right">{incidentDetails.pinCode}</span>
                </CCol>
                <CCol md={12}>
                  <span>
                    <b>Address</b>
                  </span>
                  <br></br>
                  <span>{incidentDetails.fullAddress}</span>
                </CCol>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
      <Mail_View visible={mailsVisible} setVisible={setMailsVisible} item={mailsBody} />
    </>
  )
}

export default View_Incident
