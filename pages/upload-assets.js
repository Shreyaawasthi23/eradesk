import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const UploadAssets = dynamic(() => import('@/views/assets/Upload_Assets'), { ssr: false })

const UploadAssetsPage = () => <UploadAssets />
UploadAssetsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default UploadAssetsPage
