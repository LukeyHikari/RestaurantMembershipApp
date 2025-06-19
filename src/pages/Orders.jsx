import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [members, setMembers] = useState([])
  const [bills, setBills] = useState([])
  const [dishes, setDishes] = useState([])
  const [orderForm, setOrderForm] = useState({ billid: '', orderdate: '' })
  const [orderDishes, setOrderDishes] = useState([])
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)

  // Fetch all related data
  useEffect(() => {
    supabase.from('orders').select('*').then(({ data }) => setOrders(data || []))
    supabase.from('member').select('*').then(({ data }) => setMembers(data || []))
    supabase.from('bill').select('*').then(({ data }) => setBills(data || []))
    supabase.from('dish').select('*').then(({ data }) => setDishes(data || []))
  }, [])

  // Fetch order dishes for editing
  const fetchOrderDishes = async (ordersid) => {
    const { data } = await supabase.from('orderslist').select('*').eq('ordersid', ordersid)
    setOrderDishes(data || [])
  }

  // Handle form changes
  const handleChange = e => setOrderForm({ ...orderForm, [e.target.name]: e.target.value })

  // Handle dish quantity changes
  const handleDishChange = (dishid, quantity) => {
    setOrderDishes(prev => {
      const exists = prev.find(d => d.dishid === dishid)
      if (exists) {
        return prev.map(d => d.dishid === dishid ? { ...d, quantity } : d)
      } else {
        return [...prev, { dishid, quantity }]
      }
    })
  }

  // Handle order submit
  const handleSubmit = async e => {
    e.preventDefault()
    let ordersid = editing
    if (editing) {
      await supabase.from('orders').update(orderForm).eq('ordersid', editing)
      await supabase.from('orderslist').delete().eq('ordersid', editing)
    } else {
      const { data, error } = await supabase.from('orders').insert([{ ...orderForm }]).select()
      if (data && data[0]) ordersid = data[0].ordersid
    }
    // Insert dishes
    for (const od of orderDishes) {
      if (od.quantity > 0) {
        await supabase.from('orderslist').insert([{ ordersid, dishid: od.dishid, quantity: parseInt(od.quantity) }])
      }
    }
    setOrderForm({ billid: '', orderdate: '' })
    setOrderDishes([])
    setEditing(null)
    supabase.from('orders').select('*').then(({ data }) => setOrders(data || []))
  }

  // Edit order
  const handleEdit = async o => {
    setOrderForm({ billid: o.billid, orderdate: o.orderdate })
    setEditing(o.ordersid)
    fetchOrderDishes(o.ordersid)
  }

  // Delete order
  const handleDelete = async id => {
    setError(null)
    const { error: error1 } = await supabase.from('orderslist').delete().eq('ordersid', id)
    if (error1) {
      setError('Failed to delete order items: ' + error1.message)
      return
    }
    const { error: error2 } = await supabase.from('orders').delete().eq('ordersid', id)
    if (error2) {
      setError('Failed to delete order: ' + error2.message)
      return
    }
    supabase.from('orders').select('*').then(({ data }) => setOrders(data || []))
  }

  // Get dishes for an order
  const getOrderDishes = ordersid => {
    return supabase.from('orderslist').select('*, dish:dishid(dishname)').eq('ordersid', ordersid)
  }

  return (
    <div>
      <h2>Orders</h2>
      <form onSubmit={handleSubmit}>
        <select name="billid" value={orderForm.billid} onChange={handleChange} required>
          <option value="">Select Bill</option>
          {bills.map(b => <option key={b.billid} value={b.billid}>Bill #{b.billid}</option>)}
        </select>
        <input name="orderdate" type="date" value={orderForm.orderdate} onChange={handleChange} required />
        <div>
          <h4>Dishes</h4>
          {dishes.map(d => (
            <div key={d.dishid}>
              <label>{d.dishname} (${d.dishprice})</label>
              <input type="number" min="0" value={orderDishes.find(od => od.dishid === d.dishid)?.quantity || ''} onChange={e => handleDishChange(d.dishid, e.target.value)} placeholder="Quantity" />
            </div>
          ))}
        </div>
        <button type="submit">{editing ? 'Update' : 'Add'} Order</button>
        {editing && <button type="button" onClick={() => { setEditing(null); setOrderForm({ billid: '', orderdate: '' }); setOrderDishes([]) }}>Cancel</button>}
      </form>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <ul>
        {orders.map(o => (
          <li key={o.ordersid}>
            Order #{o.ordersid} | Bill: {o.billid} | Date: {o.orderdate}
            <button onClick={() => handleEdit(o)}>Edit</button>
            <button onClick={() => handleDelete(o.ordersid)}>Delete</button>
            <OrderDishesList ordersid={o.ordersid} dishes={dishes} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function OrderDishesList({ ordersid, dishes }) {
  const [orderDishes, setOrderDishes] = useState([])
  useEffect(() => {
    supabase.from('orderslist').select('*').eq('ordersid', ordersid).then(({ data }) => setOrderDishes(data || []))
  }, [ordersid])
  return (
    <ul>
      {orderDishes.map(od => {
        const dish = dishes.find(d => d.dishid === od.dishid)
        return <li key={od.dishid}>{dish ? dish.dishname : od.dishid} x {od.quantity}</li>
      })}
    </ul>
  )
} 