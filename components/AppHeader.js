import React, { useState } from 'react'
import Link from 'next/link'
import { useSidebar } from '@/context/SidebarContext'
import {
  CContainer,
  CHeader,
  CHeaderBrand,
  CHeaderDivider,
  CHeaderNav,
  CHeaderToggler,
  CNavLink,
  CNavItem,
  CButton,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilEnvelopeOpen,
  cilImagePlus,
  cilList,
  cilMenu,
  cilNewspaper,
} from '@coreui/icons'

import AppBreadcrumb from './AppBreadcrumb'
import AppHeaderDropdown from './header/AppHeaderDropdown'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine, faCirclePlus, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import New_Incident from './model/New_Incident'
import { getUserDetails } from '@/lib/auth'

const AppHeader = () => {
  const { sidebarShow, setSidebarShow } = useSidebar()
  const [incidentModal, setIncidetModal] = useState(false)
  const details = getUserDetails()
  const openIncident = () => {
    setIncidetModal(true)
  }
  return (
    <>
      <CHeader position="sticky" className="mb-4 app-header">
        <CContainer fluid>
          <CHeaderToggler className="ps-1 app-header-toggler" onClick={() => setSidebarShow(!sidebarShow)}>
            <CIcon icon={cilMenu} size="lg" />
          </CHeaderToggler>
          <CHeaderBrand className="mx-auto d-md-none" component={Link} href="/dashboard">
            <strong
              className="sidebar-brand-full sidebar-logo-out"
              style={{ color: 'rgb(55 66 83)' }}
            >
              ERADESK
            </strong>
            {/* <small
              className="sidebar-brand-full sidebar-logo-out"
              style={{ color: 'rgb(55 66 83)' }}
            >
              2.0
            </small> */}
          </CHeaderBrand>
          <CHeaderNav className="d-none d-md-flex me-auto">
            <CNavItem>
              <CNavLink as={Link} href="/dashboard" className="app-header-nav-link">
                Dashboard
              </CNavLink>
            </CNavItem>
          </CHeaderNav>
          {details?.roles?.includes('ROLE_ADMIN') ||
            details?.roles?.includes('ROLE_USER') ||
            details?.roles?.includes('ROLE_MODERATOR') ? (
            <CHeaderNav className="app-header-icons">
              <CNavItem>
                <CNavLink href="#" className="app-header-icon-btn" title="Sales">
                  <FontAwesomeIcon icon={faChartLine} />
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink onClick={openIncident} className="app-header-icon-btn" title="New Incident">
                  <FontAwesomeIcon icon={faCirclePlus} />
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink className="app-header-icon-btn" title="Security">
                  <FontAwesomeIcon icon={faShieldHalved} />
                </CNavLink>
              </CNavItem>
            </CHeaderNav>
          ) : null}

          <CHeaderNav className="ms-3">
            <AppHeaderDropdown />
          </CHeaderNav>
        </CContainer>
        <CContainer fluid className="app-header-breadcrumb-row">
          <AppBreadcrumb />
        </CContainer>
      </CHeader>

      <New_Incident visible={incidentModal} setVisible={setIncidetModal} />
    </>
  )
}

export default AppHeader
