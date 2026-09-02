import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const ReleaseDetail = dynamic(() => import('@/views/release/ReleaseDetail'), { ssr: false })

const ReleaseDetailPage = () => <ReleaseDetail />
ReleaseDetailPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ReleaseDetailPage
