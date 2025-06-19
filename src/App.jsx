import { useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'
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

function Login({ onLogin }) {
  const [role, setRole] = useState('admin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (role === 'admin') {
      if (username === 'admin' && password === 'password') {
        localStorage.setItem('isAdmin', 'true')
        onLogin('admin')
        navigate('/')
      } else {
        setError('Invalid credentials')
      }
    } else {
      localStorage.setItem('isMember', 'true')
      onLogin('member')
      navigate('/order')
    }
  }

  return (
    <div style={{ maxWidth: 300, margin: '40px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          <label>
            <input type="radio" name="role" value="admin" checked={role === 'admin'} onChange={() => setRole('admin')} /> Admin
          </label>
          <label style={{ marginLeft: 20 }}>
            <input type="radio" name="role" value="member" checked={role === 'member'} onChange={() => setRole('member')} /> Member
          </label>
        </div>
        {role === 'admin' && (
          <>
            <div>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{ width: '100%', marginBottom: 10 }}
                autoFocus
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', marginBottom: 10 }}
              />
            </div>
          </>
        )}
        <button type="submit" style={{ width: '100%' }}>Login</button>
        {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      </form>
    </div>
  )
}

function RequireAuth({ children }) {
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  if (!isAdmin) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true')
  const [isMember, setIsMember] = useState(localStorage.getItem('isMember') === 'true')
  const navigate = useNavigate();
  const handleLogin = (role) => {
    if (role === 'admin') setIsAdmin(true)
    if (role === 'member') setIsMember(true)
  }
  const handleLogout = () => {
    localStorage.removeItem('isAdmin')
    localStorage.removeItem('isMember')
    setIsAdmin(false)
    setIsMember(false)
    navigate('/login', { replace: true })
  }

  return (
    <>
      <nav>
        {isAdmin && <>
          <Link to="/">Admin Panel</Link> | <Link to="/payments">Payments</Link> | <Link to="/memberhistory">Member History</Link> | <button onClick={handleLogout} style={{ marginLeft: 8 }}>Logout</button>
        </>}
        {isMember && !isAdmin && <>
          <Link to="/order">Order Food</Link> | <button onClick={handleLogout} style={{ marginLeft: 8 }}>Logout</button>
        </>}
        {!isAdmin && !isMember && <Link to="/login">Login</Link>}
      </nav>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/order" element={<OrderPanel />} />
        <Route path="/payments" element={<RequireAuth><Payments /></RequireAuth>} />
        <Route path="/memberhistory" element={<RequireAuth><MemberHistory /></RequireAuth>} />
        <Route path="/" element={<RequireAuth><RestaurantDashboard /></RequireAuth>} />
        <Route path="/members" element={<RequireAuth><Members /></RequireAuth>} />
        <Route path="/dishes" element={<RequireAuth><Dishes /></RequireAuth>} />
        <Route path="/bills" element={<RequireAuth><Bills /></RequireAuth>} />
        <Route path="/discounts" element={<RequireAuth><Discounts /></RequireAuth>} />
      </Routes>
    </>
  )
}

export default App
