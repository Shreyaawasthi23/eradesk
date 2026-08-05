import Cookies from 'js-cookie'

export const getUserDetails = () => {
  const userLogin = Cookies.get('userLogin')
  if (!userLogin) return null
  try {
    return JSON.parse(userLogin)
  } catch {
    return null
  }
}
