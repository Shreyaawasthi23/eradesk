import React from 'react'
import {
  CAvatar,
  CBadge,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import {
  cilBell,
  cilCreditCard,
  cilCommentSquare,
  cilEnvelopeOpen,
  cilFile,
  cilLockLocked,
  cilTask,
  cilUser,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'

import Cookies from 'js-cookie'
import { useRouter } from 'next/router'
import { getUserDetails } from '@/lib/auth'

const AppHeaderDropdown = () => {
  const details = getUserDetails()
  const router = useRouter()

  const handelLogout = () => {
    Cookies.remove('userLogin')
    router.push('/')
  }

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0" caret={false}>
        <CAvatar className="app-header-avatar" status="success">
          {details?.firstName?.substring(0, 2).toUpperCase()}
        </CAvatar>
      </CDropdownToggle>
      <CDropdownMenu className="pt-0 app-header-dropdown-menu" placement="bottom-end">
        <CDropdownHeader className="fw-semibold py-2 app-header-dropdown-title">
          {details?.firstName} {details?.lastName}
        </CDropdownHeader>
        <CDropdownItem href="/users-profile">
          <CIcon icon={cilUser} className="me-2" />
          Profile
        </CDropdownItem>
        <CDropdownItem onClick={(e) => handelLogout()}>
          <CIcon icon={cilLockLocked} className="me-2" />
          Logout
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
