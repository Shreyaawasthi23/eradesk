import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const Incident = dynamic(() => import('@/views/incident/Incident'), { ssr: false })

const IncidentPage = () => <Incident />
IncidentPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default IncidentPage
