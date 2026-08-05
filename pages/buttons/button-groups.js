import DashboardLayout from '@/components/layout/DashboardLayout'
import ButtonGroups from '@/views/buttons/button-groups/ButtonGroups'

const ButtonGroupsPage = () => <ButtonGroups />
ButtonGroupsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ButtonGroupsPage
