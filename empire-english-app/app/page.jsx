import DailyTasks from '../components/DailyTasks'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

export default function Home() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          <DailyTasks />
        </main>
      </div>
    </div>
  )
}
