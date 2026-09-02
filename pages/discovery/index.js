import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const Discovery = dynamic(() => import('@/views/discovery/Discovery'), { ssr: false })

const DiscoveryPage = () => <Discovery />
DiscoveryPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default DiscoveryPage
