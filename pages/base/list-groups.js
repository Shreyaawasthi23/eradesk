import DashboardLayout from '@/components/layout/DashboardLayout'
import ListGroups from '@/views/base/list-groups/ListGroups'

const ListGroupsPage = () => <ListGroups />
ListGroupsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ListGroupsPage
