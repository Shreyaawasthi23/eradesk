import React from 'react'
import { useSidebar } from '@/context/SidebarContext'
import { getUserDetails } from '@/lib/auth'

import { CSidebar, CSidebarBrand, CSidebarNav, CSidebarToggler } from '@coreui/react'

import { AppSidebarNav } from './AppSidebarNav'

import { getNav } from '@/_nav'

import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'

const AppSidebar = () => {
  const { sidebarShow, setSidebarShow, sidebarUnfoldable, setSidebarUnfoldable } = useSidebar()
  const navigation = getNav()
  const details = getUserDetails()
  const userName =
    [details?.firstName, details?.lastName].filter(Boolean).join(' ') || details?.username

  return (
    <CSidebar
      position="fixed"
      unfoldable={sidebarUnfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        setSidebarShow(visible)
      }}
    >
      <CSidebarBrand className="d-none d-md-flex sidebar-brand-strip" to="/">
        <span className="sidebar-brand-full sidebar-logo-wrap">
          <img src="/logo (2).png" alt="ERADESK" className="sidebar-logo-img" />
        </span>
        <span className="sidebar-brand-narrow sidebar-logo-wrap sidebar-logo-wrap-narrow">
          <img src="/favicon.png" alt="ERADESK" className="sidebar-logo-img-narrow" />
        </span>
      </CSidebarBrand>
      <CSidebarNav>
        <SimpleBar>
          <AppSidebarNav items={navigation} />
        </SimpleBar>
      </CSidebarNav>
      <div className="sidebar-footer d-none d-lg-flex">
        {!sidebarUnfoldable && userName && (
          <span className="sidebar-footer-username" title={userName}>
            {userName}
          </span>
        )}
        <CSidebarToggler onClick={() => setSidebarUnfoldable(!sidebarUnfoldable)} />
      </div>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
