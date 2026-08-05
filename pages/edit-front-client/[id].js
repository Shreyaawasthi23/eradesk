import DashboardLayout from '@/components/layout/DashboardLayout'
import Edit_FClient from '@/views/front-client/Edit_FClient'

const EditFrontClientPage = () => <Edit_FClient />
EditFrontClientPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default EditFrontClientPage
