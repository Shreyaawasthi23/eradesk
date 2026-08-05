import DashboardLayout from '@/components/layout/DashboardLayout'
import Users_Edit from '@/views/users/Users_Edit'

const UsersEditPage = () => <Users_Edit />
UsersEditPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default UsersEditPage
