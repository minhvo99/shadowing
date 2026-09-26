import Header from '@components/Header'
import { useSettings } from '@services/settingAPI'
import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router'

const RootLayout = () => {
  const { lang } = useSettings()
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <>
      <Header />
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </>
  )
}

export default RootLayout
