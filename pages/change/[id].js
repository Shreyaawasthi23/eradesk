import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const ChangeDetail = dynamic(() => import('@/views/change/ChangeDetail'), { ssr: false })

const ChangeDetailPage = () => <ChangeDetail />
ChangeDetailPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ChangeDetailPage
