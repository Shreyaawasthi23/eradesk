import DashboardLayout from '@/components/layout/DashboardLayout'
import Select from '@/views/forms/select/Select'

const SelectPage = () => <Select />
SelectPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default SelectPage
