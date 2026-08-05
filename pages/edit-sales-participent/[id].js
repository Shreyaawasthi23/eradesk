import DashboardLayout from '@/components/layout/DashboardLayout'
import Edit_Sales from '@/views/sales/Edit_Sales'

const EditSalesPage = () => <Edit_Sales />
EditSalesPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default EditSalesPage
