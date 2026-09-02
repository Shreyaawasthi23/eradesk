import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const Software = dynamic(() => import('@/views/software/Software'), { ssr: false })

const SoftwarePage = () => <Software />
SoftwarePage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default SoftwarePage
