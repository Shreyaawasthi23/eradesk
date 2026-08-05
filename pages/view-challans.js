import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const View_Chalan = dynamic(() => import('@/views/challan/View_Chalan'), { ssr: false })

const ViewChallansPage = () => <View_Chalan />
ViewChallansPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ViewChallansPage
