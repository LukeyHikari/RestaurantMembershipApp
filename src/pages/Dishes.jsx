import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Dishes() {
  const [dishes, setDishes] = useState([])
  const [form, setForm] = useState({ dishname: '', dishprice: '' })
  const [editing, setEditing] = useState(null)
  const [activeTab, setActiveTab] = useState('manage') // 'manage' or 'analytics'
  const [analytics, setAnalytics] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [bills, setBills] = useState([])
  const [error, setError] = useState(null)

  const fetchDishes = async () => {
    const { data } = await supabase.from('dish').select('*')
    setDishes(data || [])
  }

  const fetchOrderItems = async () => {
    const { data } = await supabase.from('orderslist').select('*')
    setOrderItems(data || [])
  }

  const fetchBills = async () => {
    const { data } = await supabase.from('bill').select('*')
    setBills(data || [])
  }

  useEffect(() => { 
    fetchDishes() 
    fetchOrderItems()
    fetchBills()
  }, [])

  useEffect(() => {
    if (activeTab === 'analytics') {
      calculateAnalytics()
    }
  }, [activeTab, dishes, orderItems, bills])

  const calculateAnalytics = () => {
    // Calculate dish statistics
    const dishStats = {}
    
    dishes.forEach(dish => {
      const items = orderItems.filter(item => item.dishid === dish.dishid)
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
      const totalSales = totalQuantity * dish.dishprice
      
      dishStats[dish.dishid] = {
        dishname: dish.dishname,
        totalQuantity,
        totalSales,
        averageOrderValue: totalQuantity > 0 ? totalSales / totalQuantity : 0
      }
    })

    // Most ordered dishes (by quantity)
    const mostOrderedDishes = Object.values(dishStats)
      .filter(dish => dish.totalQuantity > 0)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10)

    // Highest revenue dishes
    const highestRevenueDishes = Object.values(dishStats)
      .filter(dish => dish.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10)

    // Overall statistics
    const totalDishesSold = Object.values(dishStats).reduce((sum, dish) => sum + dish.totalQuantity, 0)
    const totalRevenue = Object.values(dishStats).reduce((sum, dish) => sum + dish.totalSales, 0)
    const averageDishPrice = dishes.length > 0 ? dishes.reduce((sum, dish) => sum + dish.dishprice, 0) / dishes.length : 0

    setAnalytics({
      mostOrderedDishes,
      highestRevenueDishes,
      totalDishesSold,
      totalRevenue,
      averageDishPrice,
      dishStats
    })
  }

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    if (editing) {
      await supabase.from('dish').update({ ...form, dishprice: parseFloat(form.dishprice) }).eq('dishid', editing)
      setEditing(null)
    } else {
      const { data: allDishes } = await supabase.from('dish').select('dishid')
      const maxId = allDishes && allDishes.length > 0 ? Math.max(...allDishes.map(d => d.dishid)) : 0
      const dishid = maxId + 1
      await supabase.from('dish').insert([{ dishid, ...form, dishprice: parseFloat(form.dishprice) }])
    }
    setForm({ dishname: '', dishprice: '' })
    fetchDishes()
  }

  const handleEdit = d => {
    setForm({ dishname: d.dishname, dishprice: d.dishprice })
    setEditing(d.dishid)
  }

  const handleDelete = async id => {
    setError(null)
    const { error } = await supabase.from('dish').delete().eq('dishid', id)
    if (error) {
      setError('Failed to delete dish: ' + error.message)
      return
    }
    fetchDishes()
  }

  return (
    <div>
      <h2>Dishes</h2>
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('manage')}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: activeTab === 'manage' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'manage' ? 'white' : 'black',
            border: '1px solid #ddd',
            cursor: 'pointer'
          }}
        >
          Manage Dishes
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          style={{ 
            padding: '10px 20px',
            backgroundColor: activeTab === 'analytics' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'analytics' ? 'white' : 'black',
            border: '1px solid #ddd',
            cursor: 'pointer'
          }}
        >
          Analytics
        </button>
      </div>

      {/* Manage Dishes Tab */}
      {activeTab === 'manage' && (
        <div>
          <form onSubmit={handleSubmit}>
            <input name="dishname" placeholder="Dish Name" value={form.dishname} onChange={handleChange} required />
            <input name="dishprice" type="number" step="0.01" placeholder="Price" value={form.dishprice} onChange={handleChange} required />
            <button type="submit">{editing ? 'Update' : 'Add'} Dish</button>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm({ dishname: '', dishprice: '' }) }}>Cancel</button>}
          </form>
          <ul>
            {dishes.map(d => (
              <li key={d.dishid}>
                {d.dishname} (${d.dishprice})
                <button onClick={() => handleEdit(d)}>Edit</button>
                <button onClick={() => handleDelete(d.dishid)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px' }}>
          {/* Overall Statistics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
              <h4 style={{ marginTop: 0, color: '#000', fontWeight: 'bold', fontSize: '16px' }}>Total Dishes Sold</h4>
              <p style={{ color: '#000', margin: '8px 0', fontSize: '18px', fontWeight: 'bold' }}>{analytics.totalDishesSold}</p>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
              <h4 style={{ marginTop: 0, color: '#000', fontWeight: 'bold', fontSize: '16px' }}>Total Revenue</h4>
              <p style={{ color: '#000', margin: '8px 0', fontSize: '18px', fontWeight: 'bold' }}>${analytics.totalRevenue.toFixed(2)}</p>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
              <h4 style={{ marginTop: 0, color: '#000', fontWeight: 'bold', fontSize: '16px' }}>Average Dish Price</h4>
              <p style={{ color: '#000', margin: '8px 0', fontSize: '18px', fontWeight: 'bold' }}>${analytics.averageDishPrice.toFixed(2)}</p>
            </div>
          </div>

          {/* Most Ordered Dishes */}
          <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', backgroundColor: '#f9f9f9', marginBottom: '20px' }}>
            <h4 style={{ marginTop: 0, color: '#000', fontWeight: 'bold', fontSize: '16px' }}>Most Ordered Dishes (by Quantity)</h4>
            {analytics.mostOrderedDishes.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e9ecef' }}>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#000' }}>Dish</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#000' }}>Quantity Sold</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#000' }}>Total Sales</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#000' }}>Average Order Value</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.mostOrderedDishes.map((dish, index) => (
                    <tr key={index} style={{ backgroundColor: '#ffffff' }}>
                      <td style={{ border: '1px solid #ddd', padding: '8px', color: '#000' }}>{dish.dishname}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px', color: '#000' }}>{dish.totalQuantity}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px', color: '#000' }}>${dish.totalSales.toFixed(2)}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px', color: '#000' }}>${dish.averageOrderValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#000' }}>No order data available.</p>
            )}
          </div>

          {/* Highest Revenue Dishes */}
          <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
            <h4 style={{ marginTop: 0, color: '#000', fontWeight: 'bold', fontSize: '16px' }}>Highest Revenue Dishes</h4>
            {analytics.highestRevenueDishes.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e9ecef' }}>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#000' }}>Dish</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#000' }}>Total Revenue</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#000' }}>Quantity Sold</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#000' }}>Average Order Value</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.highestRevenueDishes.map((dish, index) => (
                    <tr key={index} style={{ backgroundColor: '#ffffff' }}>
                      <td style={{ border: '1px solid #ddd', padding: '8px', color: '#000' }}>{dish.dishname}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px', color: '#000' }}>${dish.totalSales.toFixed(2)}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px', color: '#000' }}>{dish.totalQuantity}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px', color: '#000' }}>${dish.averageOrderValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#000' }}>No revenue data available.</p>
            )}
          </div>
        </div>
      )}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  )
} 