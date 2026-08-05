import Cookies from 'js-cookie'
import Swal from 'sweetalert2'
import { apiUrl, tenant } from '@/lib/config'

export const login = async (email, password, router) => {
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant': '' + tenant + '' },
    body: '{"email":"' + email + '","password":"' + password + '"}',
  }
  fetch(apiUrl + '/api/auth/signin/email', options)
    .then((response) => response.json())
    .then((response) => {
      if (response.token != null) {
        Cookies.set('userLogin', JSON.stringify(response))
        router.push('/dashboard')
      } else {
        Swal.fire(
          'User not found!',
          'Sorry, we could not find your account. Please contact the administrator for further assistance',
          'error',
        )
      }
    })
    .catch((err) =>
      Swal.fire(
        'User not found!',
        'Sorry, we could not find your account. Please contact the administrator for further assistance',
        'error',
      ),
    )
}
