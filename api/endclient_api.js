import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import Swal from 'sweetalert2'

export const createEndClient = async (endClient, router) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    name: endClient.name,
    contactName: endClient.contactName,
    contactNumber: endClient.contactNumber,
    contactEmail: endClient.contactEmail,
    frontClientId: endClient.frontClientId,
    userId: endClient.userId,
    status: endClient.status,
    salesIds: endClient.salesIds,
  })

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  try {
    const response = await fetch(apiUrl + '/auth/end-client/create', requestOptions)
    if (response.status === 401) {
      router.push('/')
    } else {
      const result = await response.json()
      if (result.statusCode === 200) {
        const confirmedResult = await Swal.fire({
          title: result.message,
          text: "Now let's Purchase Order",
          icon: 'success',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Next',
        })
        if (confirmedResult.isConfirmed) {
          router.push('/create-purchase')
        }
      } else {
        Swal.fire('Oops!', '' + result.message + '', 'warning')
      }
    }
  } catch (error) {
    console.log('error', error)
  }
}

export const editEndClient = (endClient, router, onSuccess) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    name: endClient.name,
    contactName: endClient.contactName,
    contactNumber: endClient.contactNumber,
    contactEmail: endClient.contactEmail,
    frontClientId: endClient.frontClientId,
    userId: endClient.userId,
    status: endClient.status,
    salesIds: endClient.salesIds,
  })

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  fetch(
    apiUrl + '/auth/end-client/edit?id=' + endClient.id + '&remarks=' + endClient.remarks + '',
    requestOptions,
  )
    .then((response) => (response.status === 401 ? router.push('/') : response.json()))
    .then((result) => {
      if (result !== null) {
        if (result.statusCode === 200) {
          Swal.fire('Great!', '' + result.message + '', 'success').then(() => {
            if (onSuccess) {
              onSuccess()
            } else {
              router.push('/create-end-client')
            }
          })
        } else {
          Swal.fire('Oops!', '' + result.message + '', 'warning')
        }
      }
    })
    .catch((error) => console.log('error', error))
}
