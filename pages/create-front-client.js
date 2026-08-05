import DashboardLayout from '@/components/layout/DashboardLayout'
import Create_Client from '@/views/front-client/Create_Client'

const CreateFrontClientPage = () => <Create_Client />
CreateFrontClientPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default CreateFrontClientPage
