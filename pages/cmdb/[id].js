import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const CIDetail = dynamic(() => import('@/views/cmdb/CIDetail'), { ssr: false })

const CmdbDetailPage = () => <CIDetail />
CmdbDetailPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default CmdbDetailPage
