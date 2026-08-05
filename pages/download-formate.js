import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const DownlaodFormate = dynamic(() => import('@/views/assets/Downlaod_Formate'), { ssr: false })

const DownloadFormatePage = () => <DownlaodFormate />
DownloadFormatePage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default DownloadFormatePage
