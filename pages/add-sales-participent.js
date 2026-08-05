import DashboardLayout from '@/components/layout/DashboardLayout'
import Create_Sales from '@/views/sales/Create_Sales'

const CreateSalesPage = () => <Create_Sales />
CreateSalesPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default CreateSalesPage
