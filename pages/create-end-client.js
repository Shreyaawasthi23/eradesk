import DashboardLayout from '@/components/layout/DashboardLayout'
import End_Client from '@/views/end-client/End_Client'

const CreateEndClientPage = () => <End_Client />
CreateEndClientPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default CreateEndClientPage
