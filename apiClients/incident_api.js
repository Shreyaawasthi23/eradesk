import { apiUrl, tenant } from '@/lib/config'
import Swal from 'sweetalert2'
import { getUserDetails } from '@/lib/auth'

export const createIncident = (incident, router, setVisible, resetForm, setIsLoading) => {
  const details = getUserDetails()
  setIsLoading(true)
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    incidentDate: incident.incidentDate,
    serialNumber: incident.serialNumber,
    problem: incident.problem,
    make: incident.make,
    model: incident.model,
    priority: incident.priority,
    assetType: incident.assetType,
    engineerId: incident.engineerId,
    poType: incident.poType,
    contactName: incident.contactName,
    contactEmail: incident.contactEmail,
    contactNumber: incident.contactNumber,
    sla: incident.sla,
    userId: incident.userId,
    state: incident.state,
    city: incident.city,
    pinCode: incident.pinCode,
    fullAddress: incident.fullAddress,
  })

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  fetch(apiUrl + '/auth/core/incident/create', requestOptions)
    .then((response) => (response.status === 401 ? router.push('/') : response.json()))
    .then((result) => {
      if (result.statusCode === 200) {
        setIsLoading(false)
        Swal.fire({
          title: result.message,
          text: 'Lets now view the ticket and resolve it',
          icon: 'success',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Next',
        }).then((result) => {
          if (result.isConfirmed) {
            setVisible(false)
            resetForm()
            router.push('/incident')
          } else {
            setVisible(false)
            resetForm()
          }
        })
      } else {
        setIsLoading(false)
        Swal.fire('Oops!', '' + result.message + '', 'warning')
      }
    })
    .catch((error) => {
      setIsLoading(false)
      console.log('error', error)
    })
}

export const editIncident = (incident, router, onSuccess) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    incidentDate: incident.incidentDate,
    serialNumber: incident.serialNumber,
    problem: incident.problem,
    make: incident.make,
    model: incident.model,
    priority: incident.priority,
    amcScope: incident.amcScope,
    assetType: incident.assetType,
    engineerId: incident.engineerId,
    poType: incident.poType,
    contactName: incident.contactName,
    contactEmail: incident.contactEmail,
    contactNumber: incident.contactNumber,
    sla: incident.sla,
    userId: incident.userId,
    state: incident.state,
    city: incident.city,
    pinCode: incident.pinCode,
    fullAddress: incident.fullAddress,
    status: incident.status,
  })

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  fetch(
    apiUrl + '/auth/core/incident/edit?id=' + incident.id + '&userId=' + incident.userId,
    requestOptions,
  )
    .then((response) => (response.status === 401 ? router.push('/') : response.json()))
    .then((result) => {
      if (result.statusCode === 200) {
        if (onSuccess) {
          Swal.fire('Great!', '' + result.message + '', 'success')
          onSuccess()
        } else {
          Swal.fire({
            title: result.message,
            text: 'Lets now view the Incidents',
            icon: 'success',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Next',
          }).then((result) => {
            if (result.isConfirmed) {
              router.push('/incident')
            }
          })
        }
      } else {
        Swal.fire('Oops!', '' + result.message + '', 'warning')
      }
    })
    .catch((error) => console.log('error', error))
}

export const addNotes = async (note, resetForm, router, setVisible) => {
  const details = getUserDetails()
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
      apiUrl +
        '/auth/core/incident/add-notes?note=' +
        note.note +
        '&userId=' +
        note.userId +
        '&incidentId=' +
        note.incidentId +
        '',
      requestOptions,
    )
    if (response.status === 401) {
      router.push('/')
    } else {
      const data = await response.json()
      if (data.statusCode === 200) {
        Swal.fire({
          title: data.message,
          text: 'Note successfully added to the ticket',
          icon: 'success',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Next',
        }).then((result) => {
          if (result.isConfirmed) {
            setVisible(false)
            resetForm()
          } else {
            resetForm()
          }
        })
      } else {
        Swal.fire('Oops!', '' + data.message + '', 'warning')
      }
    }
  } catch (error) {
    console.log('Error:', error)
  }
}

export const updateIncidentStatus = async (
  incident,
  router,
  getIncidentPage,
  currentPage,
  resetForm,
  setVisible,
) => {
  const details = getUserDetails()
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
      apiUrl +
        '/auth/core/incident/incident-status-update?incidentId=' +
        incident.incidentId +
        '&status=' +
        incident.status +
        '&additionalDetails=' +
        incident.note +
        '&userId=' +
        details?.id +
        '',
      requestOptions,
    )
    if (response.status === 401) {
      router.push('/')
    } else {
      const data = await response.json()
      if (data.statusCode === 200) {
        Swal.fire({
          title: 'Success',
          text: data.message,
          icon: 'success',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Done',
        }).then((result) => {
          if (result.isConfirmed) {
            getIncidentPage(currentPage, 100)
            setVisible(false)
            resetForm()
          } else {
            resetForm()
          }
        })
      } else {
        Swal.fire('Oops!', '' + data.message + '', 'warning')
      }
    }
  } catch (error) {
    console.log('error', error)
  }
}

export const assignEngineer = async (
  engineerId,
  incidentId,
  router,
  getIncidentPage,
  currentPage,
  setIsLoading,
) => {
  const details = getUserDetails()
  try {
    setIsLoading(true)
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    const response = await fetch(
      apiUrl +
        '/auth/core/incident/incident-engineer-assign?incidentId=' +
        incidentId +
        '&engineerId=' +
        engineerId +
        '&userId=' +
        details?.id +
        '',
      requestOptions,
    )
    if (response.status === 401) {
      router.push('/')
    } else {
      const data = await response.json()
      if (data.statusCode === 200) {
        setIsLoading(false)
        Swal.fire({
          title: 'Success',
          text: data.message,
          icon: 'success',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Done',
        }).then((result) => {
          if (result.isConfirmed) {
            getIncidentPage(currentPage, 100)
          }
        })
      } else {
        setIsLoading(false)
        Swal.fire('Oops!', '' + data.message + '', 'warning')
      }
    }
  } catch (error) {
    console.log('error', error)
  }
}
