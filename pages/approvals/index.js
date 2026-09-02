import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const Approvals = dynamic(() => import('@/views/approval/Approvals'), { ssr: false })

const ApprovalsPage = () => <Approvals />
ApprovalsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ApprovalsPage
