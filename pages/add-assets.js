import DashboardLayout from '@/components/layout/DashboardLayout'
import Add_Assets from '@/views/assets/Add_Assets'

const AddAssetsPage = () => <Add_Assets />
AddAssetsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default AddAssetsPage
