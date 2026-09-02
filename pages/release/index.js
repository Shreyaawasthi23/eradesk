import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const Release = dynamic(() => import('@/views/release/Release'), { ssr: false })

const ReleasePage = () => <Release />
ReleasePage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ReleasePage
