import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const Problem = dynamic(() => import('@/views/problem/Problem'), { ssr: false })

const ProblemPage = () => <Problem />
ProblemPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ProblemPage
