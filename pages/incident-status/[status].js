import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const Incident_Status = dynamic(() => import('@/views/incident/Incident_Status'), { ssr: false })

const IncidentStatusPage = () => <Incident_Status />
IncidentStatusPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default IncidentStatusPage
