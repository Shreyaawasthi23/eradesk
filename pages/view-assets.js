import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const ViewAssets = dynamic(() => import('@/views/assets/View_Assets'), { ssr: false })

const ViewAssetsPage = () => <ViewAssets />
ViewAssetsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ViewAssetsPage
