import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const Survey = dynamic(() => import('@/views/survey/Survey'), { ssr: false })

const SurveyPage = () => <Survey />
SurveyPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default SurveyPage
