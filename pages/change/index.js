import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const Change = dynamic(() => import('@/views/change/Change'), { ssr: false })

const ChangePage = () => <Change />
ChangePage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ChangePage
