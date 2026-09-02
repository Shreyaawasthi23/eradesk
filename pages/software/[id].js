import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const SoftwareDetail = dynamic(() => import('@/views/software/SoftwareDetail'), { ssr: false })

const SoftwareDetailPage = () => <SoftwareDetail />
SoftwareDetailPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default SoftwareDetailPage
