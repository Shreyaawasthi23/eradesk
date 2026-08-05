import { useEffect } from 'react'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/layout/DashboardLayout'

// Editing assets now happens in a modal on the listing pages.
const EditAssetsPage = () => {
  const router = useRouter()
  useEffect(() => {
    router.replace('/view-assets')
  }, [router])
  return null
}
EditAssetsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default EditAssetsPage
