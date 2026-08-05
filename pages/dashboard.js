import Head from 'next/head'
import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const Dashboard = dynamic(() => import('@/views/dashboard/Dashboard'), { ssr: false })

const DashboardPage = () => {
  return (
    <>
      <Head>
        <title>Dashboard - ERADESK</title>
      </Head>
      <Dashboard />
    </>
  )
}

DashboardPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default DashboardPage
