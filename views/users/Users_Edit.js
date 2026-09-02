import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormCheck,
  CFormInput,
  CFormSelect,
  CRow,
} from '@coreui/react'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import * as Yup from 'yup'
import { EditUser } from '@/api/user_api'
import { useFormik } from 'formik'

const Users_Edit = () => {
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = React.useState({})
  const rolesOptions = [
    { label: 'ROLE_ADMIN', value: 'admin' },
    { label: 'ROLE_MODERATOR', value: 'mod' },
    { label: 'ROLE_USER', value: 'user' },
    { label: 'ROLE_ENGINEER', value: 'engineer' },
  ]
  const details = getUserDetails()
  const [existingRoles, setExistingRoles] = useState([])

  const getUserDetailsFromApi = () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/api/auth/core/users/get-user-details?id=' + id, requestOptions)
      .then((response) => response.json())
      .then((result) => {
        // console.log(result)
        setUser(result)
        if (result.roles != null) {
          const roleNames = result.roles.map((role) => role.name)
          setExistingRoles(roleNames)
        }
      })
      .catch((error) => {})
  }

  const checkUsername = async (value) => {
    try {
      var myHeaders = new Headers()
      myHeaders.append('X-Tenant', '' + tenant + '')
      myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

      var requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      }

      const response = await fetch(
        apiUrl + '/api/auth/core/users/check-username?username=' + value,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      }
      const data = await response.json()
      if (data.statusCode === 200) {
        return true
      } else {
        return false
      }
    } catch (error) {
      throw error
    }
  }

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      username: user.username,
      roles: [],
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      userEmail: user.email,
      status: user.status,
      userId: details?.id,
      id: id,
    },
    validationSchema: Yup.object({
      username: Yup.string().required('Required'),
      // .test('check-username', 'Username already exists', checkUsername),
      password: Yup.string().max(25, 'Must be 25 characters or less').required('Required'),
      firstName: Yup.string().required('Required'),
      lastName: Yup.string().required('Required'),
      status: Yup.boolean()
        .oneOf([true, false], 'Invalid input. Please select a value.')
        .required('Status is required'),
      userEmail: Yup.string().email('Invalid email address').required('Required'),
    }),
    onSubmit: (values) => {
      // console.log(values)
      EditUser(values, router)
    },
  })

  useEffect(() => {
    if (!id) return
    getUserDetailsFromApi()
  }, [id])

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>New Users</strong>
            <strong className="roles-view"></strong>
          </CCardHeader>
          <CCardBody>
            <CForm onSubmit={formik.handleSubmit} className="row g-3">
              <CCol md={6}>
                <CFormInput
                  type="text"
                  label="Username"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.username}
                  name="username"
                  feedbackInvalid={
                    formik.touched.username && formik.errors.username
                      ? formik.errors.username
                      : null
                  }
                  invalid={formik.touched.username && formik.errors.username ? true : false}
                  valid={formik.touched.username && formik.errors.username ? false : true}
                />
              </CCol>

              <CCol md="6">
                <CFormInput
                  type="text"
                  label="Email"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.userEmail}
                  name="userEmail"
                  feedbackInvalid={
                    formik.touched.userEmail && formik.errors.userEmail
                      ? formik.errors.userEmail
                      : null
                  }
                  invalid={formik.touched.userEmail && formik.errors.userEmail ? true : false}
                  valid={formik.touched.userEmail && formik.errors.userEmail ? false : true}
                />
              </CCol>
              <CCol md={6}>
                <CFormInput
                  type="text"
                  label="First Name"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.firstName}
                  name="firstName"
                  feedbackInvalid={
                    formik.touched.firstName && formik.errors.firstName
                      ? formik.errors.firstName
                      : null
                  }
                  invalid={formik.touched.firstName && formik.errors.firstName ? true : false}
                  valid={formik.touched.firstName && formik.errors.firstName ? false : true}
                />
              </CCol>
              <CCol md={6}>
                <CFormInput
                  type="text"
                  label="Last Name"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.lastName}
                  name="lastName"
                  feedbackInvalid={
                    formik.touched.lastName && formik.errors.lastName
                      ? formik.errors.lastName
                      : null
                  }
                  invalid={formik.touched.lastName && formik.errors.lastName ? true : false}
                  valid={formik.touched.lastName && formik.errors.lastName ? false : true}
                />
              </CCol>
              <CCol md="6">
                <CFormInput
                  type="text"
                  label="Password"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.password}
                  name="password"
                  feedbackInvalid={
                    formik.touched.password && formik.errors.password
                      ? formik.errors.password
                      : null
                  }
                  invalid={formik.touched.password && formik.errors.password ? true : false}
                  valid={formik.touched.password && formik.errors.password ? false : true}
                />
              </CCol>

              <CCol md={6}>
                <CFormSelect
                  aria-label="Status"
                  label="Status"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.status}
                  name="status"
                  feedbackInvalid={
                    formik.touched.status && formik.errors.status ? formik.errors.status : null
                  }
                  invalid={formik.touched.status && formik.errors.status ? true : false}
                  valid={formik.touched.status && formik.errors.status ? false : true}
                >
                  <option>Select</option>
                  <option value={true}>Active</option>
                  <option value={false}>Deactive</option>
                </CFormSelect>
              </CCol>

              <CCol md="6" className="row">
                <CCol md="6">
                  <label>New Roles:</label>
                  <CFormSelect
                    value={formik.values.roles}
                    onChange={(e) => {
                      const selectedRoles = Array.from(
                        e.target.selectedOptions,
                        (option) => option.value,
                      )
                      formik.setFieldValue('roles', selectedRoles)
                    }}
                    multiple
                  >
                    {rolesOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md="6">
                  <label>Existing Roles:</label>
                  {existingRoles.map((role) => (
                    <div key={role}>
                      <b>{role}</b>
                    </div>
                  ))}
                </CCol>
              </CCol>
              <CCol xs={6}>
                <CButton type="submit">Submit</CButton>
              </CCol>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Users_Edit
