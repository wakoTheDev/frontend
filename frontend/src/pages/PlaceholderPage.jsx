import { useLocation } from 'react-router-dom'
import { dashboardPath } from '../constants/routes'

const titles = {
  [dashboardPath('about')]: 'About',
  [dashboardPath('help')]: 'Help',
  [dashboardPath('feedback')]: 'Feedback',
  [dashboardPath('profile')]: 'Profile',
  [dashboardPath('settings')]: 'Settings',
  [dashboardPath('history')]: 'Download All Analysis History',
}

export default function PlaceholderPage() {
  const { pathname } = useLocation()
  const title = titles[pathname] || 'Page'

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">{title}</h1>
      <p className="text-slate-600">
        This section is available from the sidebar. Content for {title} can be added here.
      </p>
    </div>
  )
}
