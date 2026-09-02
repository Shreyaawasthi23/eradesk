import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const ConfigurationItems = dynamic(() => import('@/views/cmdb/ConfigurationItems'), { ssr: false })

const CmdbPage = () => <ConfigurationItems />
CmdbPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default CmdbPage
