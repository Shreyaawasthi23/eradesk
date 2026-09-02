import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const SlaConfig = dynamic(() => import('@/views/sla/SlaConfig'), { ssr: false })

const SlaPage = () => <SlaConfig />
SlaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default SlaPage
