import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const RMA = dynamic(() => import('@/views/rma/RMA'), { ssr: false })

const RmaPage = () => <RMA />
RmaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default RmaPage
