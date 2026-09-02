import { apiUrl, tenant } from '@/lib/config'
import Swal from 'sweetalert2'
import { getUserDetails } from '@/lib/auth'

export const createPurchase = async (purchase, router, onSuccess) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    endClientId: purchase.endClientId,
    purchaseOrderNumber: purchase.purchaseOrderNumber,
    contactName: purchase.contactName,
    contactNumber: purchase.contactNumber,
    contactEmail: purchase.contactEmail,
    startDate: purchase.startDate, //Date
    endDate: purchase.endDate, //Date
    poReceiveDate: purchase.poReceiveDate,
    type: purchase.type,
    userId: purchase.userId,
    status: purchase.status,
    value: purchase.value,
    salesId: purchase.salesId,
  })

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  try {
    const response = await fetch(apiUrl + '/auth/core/purchase/add', requestOptions)
    if (response.status === 401) {
      router.push('/')
    } else {
      const result = await response.json()
      if (result.statusCode === 200) {
        if (onSuccess) onSuccess()
        const confirmedResult = await Swal.fire({
          title: result.message,
          text: "Now let's add Assets",
          icon: 'success',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Next',
        })
        if (confirmedResult.isConfirmed) {
          router.push('/add-assets')
        }
      } else {
        Swal.fire('Oops!', '' + result.message + '', 'warning')
      }
    }
  } catch (error) {
    console.log('error', error)
  }
}

export const editPurchase = (purchase, router, onSuccess) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    endClientId: purchase.endClientId,
    purchaseOrderNumber: purchase.purchaseOrderNumber,
    contactName: purchase.contactName,
    contactNumber: purchase.contactNumber,
    contactEmail: purchase.contactEmail,
    startDate: purchase.startDate,
    endDate: purchase.endDate,
    poReceiveDate: purchase.poReceiveDate,
    type: purchase.type,
    userId: details?.id,
    status: purchase.status,
    value: purchase.value,
    salesId: purchase.salesId,
  })

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  fetch(
    apiUrl + '/auth/core/purchase/edit?locationId=' + purchase.id + '&remarks=' + purchase.remarks + '',
    requestOptions,
  )
    .then((response) => (response.status === 401 ? router.push('/') : response.json()))
    .then((result) => {
      if (result.statusCode === 200) {
        Swal.fire('Great!', '' + result.message + '', 'success').then(() => {
          if (onSuccess) {
            onSuccess()
          } else {
            router.push('/create-purchase')
          }
        })
      } else {
        Swal.fire('Oops!', '' + result.message + '', 'warning')
      }
    })
    .catch((error) => console.log('error', error))
}
