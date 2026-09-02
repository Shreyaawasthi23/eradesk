import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const ProblemDetail = dynamic(() => import('@/views/problem/ProblemDetail'), { ssr: false })

const ProblemDetailPage = () => <ProblemDetail />
ProblemDetailPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ProblemDetailPage
