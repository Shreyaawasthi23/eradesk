import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import Swal from 'sweetalert2'

export const createFrontClient = async (frontClient, router) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    name: frontClient.name,
    contactName: frontClient.contactName,
    contactNumber: frontClient.contactNumber,
    contactEmail: frontClient.contactEmail,
    gstNumber: frontClient.gstNumber,
    panNumber: frontClient.panNumber,
    address: frontClient.address,
    pinCode: frontClient.pinCode,
    city: frontClient.city,
    state: frontClient.state,
    country: frontClient.country,
    userId: frontClient.userId,
    status: frontClient.status,
    salesIds: frontClient.salesIds,
  })
  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  try {
    const response = await fetch(apiUrl + '/auth/core/front-client/create', requestOptions)
    if (response.status === 401) {
      window.location.href = '/'
    } else {
      try {
        const data = await response.json()
        if (data !== null && data.statusCode === 200) {
          Swal.fire({
            title: data.message,
            text: "Now let's add End-Client",
            icon: 'success',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Next',
          }).then((result) => {
            if (result.isConfirmed) {
              router.push('/create-end-client')
            }
          })
        } else {
          Swal.fire('Oops!', '' + data.message + '', 'warning')
        }
      } catch (jsonError) {}
    }
  } catch (error) {
    console.error('Error fetching data:', error)
    // Handle the error (e.g., show an error message, retry the request, etc.)
  }
}

export const editFrontClient = (editClient, router, onSuccess) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    name: editClient.name,
    contactName: editClient.contactName,
    contactNumber: editClient.contactNumber,
    contactEmail: editClient.contactEmail,
    gstNumber: editClient.gstNumber,
    panNumber: editClient.panNumber,
    address: editClient.address,
    pinCode: editClient.pinCode,
    city: editClient.city,
    state: editClient.state,
    country: editClient.country,
    userId: editClient.userId,
    status: editClient.status,
    salesIds: editClient.salesIds,
  })

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  fetch(
    apiUrl + '/auth/core/front-client/edit?id=' + editClient.id + '&remarks=' + editClient.remarks + '',
    requestOptions,
  )
    .then((response) => (response.status === 401 ? router.push('/') : response.json()))
    .then((result) => {
      if (result.statusCode === 200) {
        Swal.fire('Great!', '' + result.message + '', 'success').then((result) => {
          if (onSuccess) {
            onSuccess()
          } else {
            router.push('/create-front-client')
          }
        })
      } else {
        Swal.fire('Oops!', '' + result.message + '', 'warning')
      }
    })
    .catch((error) => console.log('error', error))
}
