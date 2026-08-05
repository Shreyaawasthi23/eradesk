import DashboardLayout from '@/components/layout/DashboardLayout'
import User_Profile from '@/views/users/User_Profile'

const UsersProfilePage = () => <User_Profile />
UsersProfilePage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default UsersProfilePage
