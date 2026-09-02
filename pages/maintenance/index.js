import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const Maintenance = dynamic(() => import('@/views/maintenance/Maintenance'), { ssr: false })

const MaintenancePage = () => <Maintenance />
MaintenancePage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default MaintenancePage
