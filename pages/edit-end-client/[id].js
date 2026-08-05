import DashboardLayout from '@/components/layout/DashboardLayout'
import Edit_EClient from '@/views/end-client/Edit_EClient'

const EditEndClientPage = () => <Edit_EClient />
EditEndClientPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default EditEndClientPage
