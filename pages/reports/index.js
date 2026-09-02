import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const ReportBuilder = dynamic(() => import('@/views/reports/ReportBuilder'), { ssr: false })

const ReportsPage = () => <ReportBuilder />
ReportsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ReportsPage
