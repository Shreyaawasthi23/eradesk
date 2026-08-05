import { useEffect } from 'react'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/layout/DashboardLayout'

// Editing purchase orders now happens in a modal on the listing page.
const EditPurchasePage = () => {
  const router = useRouter()
  useEffect(() => {
    router.replace('/purchase-orders')
  }, [router])
  return null
}
EditPurchasePage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default EditPurchasePage
