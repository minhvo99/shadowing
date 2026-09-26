import Header from '@components/Header'
import { Suspense } from 'react'
import { Outlet } from 'react-router'

const RootLayout = () => (
  <>
    <Header />
    <Suspense fallback={null}>
      <Outlet />
    </Suspense>
  </>
)

export default RootLayout
