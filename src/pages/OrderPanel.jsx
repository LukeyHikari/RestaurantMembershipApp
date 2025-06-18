import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function OrderPanel() {
  const [dishes, setDishes] = useState([])
  const [cart, setCart] = useState([])
  const [memberid, setMemberid] = useState('')
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('dish').select('*').then(({ data }) => setDishes(data || []))
  }, [])

  const handleAddToCart = (dish) => {
    setCart(prev => {
      const exists = prev.find(item => item.dishid === dish.dishid)
      if (exists) {
        return prev.map(item => item.dishid === dish.dishid ? { ...item, quantity: item.quantity + 1 } : item)
      } else {
        return [...prev, { ...dish, quantity: 1 }]
      }
    })
  }

  const handleQuantityChange = (dishid, quantity) => {
    setCart(prev => prev.map(item => item.dishid === dishid ? { ...item, quantity: Math.max(1, Number(quantity)) } : item))
  }

  const handleRemove = (dishid) => {
    setCart(prev => prev.filter(item => item.dishid !== dishid))
  }

  const total = cart.reduce((sum, item) => sum + item.dishprice * item.quantity, 0)

  const handlePlaceOrder = async () => {
    setError(null)
    setOrderPlaced(false)
    if (!memberid) {
      setError('Please enter your Member ID.')
      return
    }
    if (cart.length === 0) {
      setError('Your cart is empty.')
      return
    }
    
    // Validate that member exists
    const { data: memberData, error: memberError } = await supabase.from('member').select('*').eq('memberid', memberid)
    if (memberError) {
      setError('Error checking member: ' + memberError.message)
      return
    }
    if (!memberData || memberData.length === 0) {
      setError('Member ID not found. Please enter a valid Member ID.')
      return
    }
    
    // Create a new order
    const orderdate = new Date().toISOString().slice(0, 10)
    // Find max ordersid and increment
    const { data: allOrders } = await supabase.from('orders').select('ordersid')
    const maxId = allOrders && allOrders.length > 0 ? Math.max(...allOrders.map(o => o.ordersid)) : 0
    const ordersid = maxId + 1
    // Insert order with memberid and billid (null for now)
    const { error: orderError } = await supabase.from('orders').insert([{ ordersid, memberid, billid: null, orderdate }])
    if (orderError) {
      setError(orderError.message)
      return
    }
    // Insert order items
    for (const item of cart) {
      const { error: itemError } = await supabase.from('orderslist').insert([{ ordersid, dishid: item.dishid, quantity: item.quantity }])
      if (itemError) {
        setError(itemError.message)
        return
      }
    }

    // Create memberhistory entry for the order
    const { data: allHistory } = await supabase.from('memberhistory').select('historyid')
    const maxHistoryId = allHistory && allHistory.length > 0 ? Math.max(...allHistory.map(h => h.historyid)) : 0
    const historyid = maxHistoryId + 1
    
    const { error: historyError } = await supabase.from('memberhistory').insert([{
      historyid,
      memberid,
      ordersid,
      paymentid: null,
      eventdate: new Date().toISOString(),
      eventtype: 'order'
    }])

    if (historyError) {
      setError('Failed to create history entry: ' + historyError.message)
      return
    }

    setOrderPlaced(true)
    setCart([])
  }

  return (
    <div>
      <h1>Order Food</h1>
      <div>
        <label>Member ID: <input value={memberid} onChange={e => setMemberid(e.target.value)} placeholder="Enter your 12-digit Member ID" style={{ width: 220 }} /></label>
      </div>
      <h2>Menu</h2>
      <ul>
        {dishes.map(dish => (
          <li key={dish.dishid}>
            {dish.dishname} (${dish.dishprice})
            <button onClick={() => handleAddToCart(dish)}>Add</button>
          </li>
        ))}
      </ul>
      <h2>Your Cart</h2>
      {cart.length === 0 ? <p>Cart is empty.</p> : (
        <ul>
          {cart.map(item => (
            <li key={item.dishid}>
              {item.dishname} (${item.dishprice}) x
              <input type="number" min="1" value={item.quantity} onChange={e => handleQuantityChange(item.dishid, e.target.value)} style={{ width: 40 }} />
              <button onClick={() => handleRemove(item.dishid)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      <h3>Total: ${total.toFixed(2)}</h3>
      <button onClick={handlePlaceOrder} disabled={cart.length === 0}>Place Order</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {orderPlaced && <div style={{ color: 'green' }}>Order placed successfully!</div>}
    </div>
  )
} 