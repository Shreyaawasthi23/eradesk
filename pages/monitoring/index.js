import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const Monitoring = dynamic(() => import('@/views/monitoring/Monitoring'), { ssr: false })

const MonitoringPage = () => <Monitoring />
MonitoringPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default MonitoringPage
