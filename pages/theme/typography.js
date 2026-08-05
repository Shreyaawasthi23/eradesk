import DashboardLayout from '@/components/layout/DashboardLayout'
import Typography from '@/views/theme/typography/Typography'

const TypographyPage = () => <Typography />
TypographyPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default TypographyPage
