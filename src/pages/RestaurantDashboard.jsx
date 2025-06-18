import { Link } from 'react-router-dom'

export default function RestaurantDashboard() {
  return (
    <div>
      <h1>Admin Panel</h1>
      <ul>
        <li><Link to="/members">Manage Members</Link></li>
        <li><Link to="/dishes">Manage Dishes</Link></li>
        <li><Link to="/bills">Manage Bills</Link></li>
        <li><Link to="/discounts">Manage Discounts</Link></li>
      </ul>
    </div>
  )
} 