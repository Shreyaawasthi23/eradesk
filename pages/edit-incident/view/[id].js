import DashboardLayout from '@/components/layout/DashboardLayout'
import View_Incident from '@/views/incident/View_Incident'

const ViewIncidentPage = () => <View_Incident />
ViewIncidentPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ViewIncidentPage
