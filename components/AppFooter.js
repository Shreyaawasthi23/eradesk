import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter>
      <div>
        <span className="ms-1">&copy; 2026 ERA DESK 2.0</span>
      </div>
      <div className="ms-auto">
        <span className="me-1">Powered by</span>
        <a href="https://lrsservices.in/" target="_blank" rel="noopener noreferrer">
          LRS Services PVT. LTD.
        </a>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
