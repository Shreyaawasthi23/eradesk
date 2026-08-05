import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import Cookies from 'js-cookie'
import { CContainer } from '@coreui/react'
import { SidebarProvider } from '@/context/SidebarContext'
import AppFooter from '@/components/AppFooter'

const AppSidebar = dynamic(() => import('@/components/AppSidebar'), { ssr: false })
const AppHeader = dynamic(() => import('@/components/AppHeader'), { ssr: false })

const DashboardLayout = ({ children }) => {
  const router = useRouter()

  useEffect(() => {
    const userLogin = Cookies.get('userLogin')
    if (!userLogin) {
      router.replace('/')
    }
  }, [router])

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100 bg-light">
        <AppHeader />
        <div className="body flex-grow-1 px-3">
          <CContainer lg>{children}</CContainer>
        </div>
        <AppFooter />
      </div>
    </SidebarProvider>
  )
}

export default DashboardLayout
