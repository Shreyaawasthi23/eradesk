import DashboardLayout from '@/components/layout/DashboardLayout'
import Edit_Challan from '@/views/challan/Edit_Challan'

const EditChallanPage = () => <Edit_Challan />
EditChallanPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default EditChallanPage
