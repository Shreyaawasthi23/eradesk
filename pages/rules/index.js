import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const BusinessRules = dynamic(() => import('@/views/rules/BusinessRules'), { ssr: false })

const RulesPage = () => <BusinessRules />
RulesPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default RulesPage
