import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const AuditLog = dynamic(() => import('@/views/audit/AuditLog'), { ssr: false })

const AuditPage = () => <AuditLog />
AuditPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default AuditPage
