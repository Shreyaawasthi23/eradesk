import DashboardLayout from '@/components/layout/DashboardLayout'
import Users from '@/views/users/Users'

const UsersPage = () => <Users />
UsersPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default UsersPage
