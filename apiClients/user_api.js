import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import Swal from 'sweetalert2'

export const CreateUser = async (user, router, onSuccess) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    username: user.username,
    email: user.email,
    roles: user.roles,
    password: user.password,
    firstName: user.firstName,
    lastName: user.lastName,
  })

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  return fetch(apiUrl + '/api/auth/core/users/signup', requestOptions)
    .then((response) => (response.status === 401 ? router.push('/') : response.json()))
    .then((result) => {
      if (result?.message === 'User registered successfully!') {
        Swal.fire(
          'Success!',
          'New user account created. Email sent with login details and instructions.',
          'success',
        )
        if (onSuccess) onSuccess()
      } else {
        Swal.fire('Oops!', '' + result?.message + '', 'warning')
      }
    })
    .catch((error) => {
      Swal.fire('Oops!', 'Unabel to create the User please try later', 'warning')
    })
}

export const EditUser = async (user, router, onSuccess) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    username: user.username,
    roles: user.roles,
    password: user.password,
    firstName: user.firstName,
    lastName: user.lastName,
    userEmail: user.userEmail,
    status: user.status,
    userId: user.userId,
  })

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  fetch(apiUrl + '/api/auth/core/users/edit-user?id=' + user.id, requestOptions)
    .then((response) => (response.status === 401 ? router.push('/') : response.json()))
    .then((result) => {
      if (result.statusCode === 200) {
        Swal.fire({
          title: 'Great',
          text: result.message,
          icon: 'success',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Done',
        }).then((result) => {
          if (onSuccess) {
            onSuccess()
          } else if (result.isConfirmed) {
            router.push('/users')
          }
        })
      } else {
        Swal.fire('Oops!', '' + result.message + '', 'warning')
      }
    })
    .catch((error) => console.log('error', error))
}

export const CreateSalesParticipant = async (sales, router, getSalesList) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    name: sales?.name,
    email: sales?.email,
    number: sales?.number,
    userId: sales?.userId,
    status: sales?.status,
  })
  // console.log(raw)
  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  fetch(apiUrl + '/auth/core/sales-team/add-participant', requestOptions)
    .then((response) => (response.status === 401 ? router.push('/') : response.json()))
    .then((result) => {
      if (result.statusCode === 200) {
        getSalesList(0, 10)
        Swal.fire('Success!', 'New Sales participant created!', 'success')
      } else {
        Swal.fire('Oops!', '' + result.message + '', 'warning')
      }
    })
    .catch((error) => {
      Swal.fire('Oops!', 'Unabel to create the User please try later', 'warning')
    })
}

export const EditSalesParticipant = async (sales, router, onSuccess) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    name: sales?.name,
    email: sales?.email,
    number: sales?.number,
    userId: sales?.userId,
    status: sales?.status,
  })
  // console.log(raw)
  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  fetch(apiUrl + '/auth/core/sales-team/edit-participant?id=' + sales.id, requestOptions)
    .then((response) => (response.status === 401 ? router.push('/') : response.json()))
    .then((result) => {
      if (result.statusCode === 200) {
        Swal.fire('Success!', 'Sales participant updated!', 'success')
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/add-sales-participent')
        }
      } else {
        Swal.fire('Oops!', '' + result.message + '', 'warning')
      }
    })
    .catch((error) => {
      Swal.fire('Oops!', 'Unabel to create the User please try later', 'warning')
    })
}
