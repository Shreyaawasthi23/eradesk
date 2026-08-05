import DashboardLayout from '@/components/layout/DashboardLayout'
import EmailSettings from '@/views/settings/EmailSettings'

const EmailSettingsPage = () => <EmailSettings />
EmailSettingsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default EmailSettingsPage
