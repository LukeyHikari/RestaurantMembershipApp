import { useEffect, useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import RestaurantDashboard from './pages/RestaurantDashboard'
import Members from './pages/Members'
import Dishes from './pages/Dishes'
import Orders from './pages/Orders'
import Bills from './pages/Bills'
import OrderPanel from './pages/OrderPanel'
import Discounts from './pages/Discounts'
import Payments from './pages/Payments'
import MemberHistory from './pages/MemberHistory'
import './App.css'

function Home() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from('test_table').select('*')
      if (!error) setData(data)
      setLoading(false)
    }
    fetchData()
  }, [])

  return (
    <div>
      <h2>Home</h2>
      {loading ? <p>Loading...</p> : (
        <ul>
          {data && data.length > 0 ? data.map((row, idx) => (
            <li key={idx}>{JSON.stringify(row)}</li>
          )) : <li>No data found.</li>}
        </ul>
      )}
    </div>
  )
}

function About() {
  return <h2>About</h2>
}

function App() {
  return (
    <>
      <nav>
        <Link to="/">Admin Panel</Link> | <Link to="/order">Order Food</Link> | <Link to="/payments">Payments</Link> | <Link to="/memberhistory">Member History</Link>
      </nav>
      <Routes>
        <Route path="/" element={<RestaurantDashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/dishes" element={<Dishes />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="/order" element={<OrderPanel />} />
        <Route path="/discounts" element={<Discounts />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/memberhistory" element={<MemberHistory />} />
      </Routes>
    </>
  )
}

export default App
