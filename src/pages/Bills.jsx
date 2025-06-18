import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Bills() {
  const [bills, setBills] = useState([])
  const [orders, setOrders] = useState([])
  const [dishes, setDishes] = useState([])
  const [discounts, setDiscounts] = useState([])
  const [form, setForm] = useState({ 
    orderid: '', 
    discountid: '', 
    tax: 0.12, 
    servicefee: 0.00,
    specialidType: '',
    specialidNo: '',
    specialidBirthday: '',
    specialidDisability: ''
  })
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchBills()
    supabase.from('orders').select('*').then(({ data }) => setOrders(data || []))
    supabase.from('dish').select('*').then(({ data }) => setDishes(data || []))
    fetchDiscounts()
  }, [])

  const fetchDiscounts = async () => {
    const { data: inhouseData } = await supabase.from('inhouse').select('*')
    const { data: specialidData } = await supabase.from('specialid').select('*')
    const { data: seniorData } = await supabase.from('senior').select('*')
    const { data: pwdData } = await supabase.from('pwd').select('*')

    // Merge specialid details into specialidData
    const specialidWithDetails = (specialidData || []).map(sid => {
      const senior = (seniorData || []).find(s => s.discountid === sid.discountid)
      const pwd = (pwdData || []).find(p => p.discountid === sid.discountid)
      return {
        ...sid,
        type: 'S',
        subtype: senior ? 'S' : pwd ? 'P' : null,
        idno: senior ? senior.idno : pwd ? pwd.idno : '',
        idbirthday: senior ? senior.idbirthday : '',
        disability: pwd ? pwd.disability : ''
      }
    })

    const allDiscounts = [
      ...(inhouseData || []).map(d => ({ ...d, type: 'I', subtype: null })),
      ...specialidWithDetails
    ]
    setDiscounts(allDiscounts)
  }

  const fetchBills = async () => {
    const { data } = await supabase.from('bill').select('*')
    setBills(data || [])
  }

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  // Helper to calculate total for an order
  const calculateTotal = async (orderid, discountid, tax, servicefee) => {
    // Get all dishes in the order
    const { data: orderDishes } = await supabase.from('orderslist').select('*').eq('ordersid', orderid)
    let subtotal = 0
    for (const od of orderDishes) {
      const dish = dishes.find(d => d.dishid === od.dishid)
      if (dish) subtotal += dish.dishprice * od.quantity
    }

    // Apply discount if any
    let discount = 0
    if (discountid) {
      if (discountid === 'specialid') {
        // Apply default 0.12 rate for specialid discount
        discount = subtotal * 0.12
      } else {
        const discountObj = discounts.find(d => d.discountid === parseInt(discountid))
        if (discountObj) {
          discount = subtotal * discountObj.discountrate
        }
      }
    }

    let total = subtotal - discount
    total = total + (total * parseFloat(tax)) + (total * parseFloat(servicefee))
    return total
  }

  // Get the memberid for the selected order
  const selectedOrder = orders.find(o => o.ordersid === parseInt(form.orderid))
  const selectedMemberId = selectedOrder ? selectedOrder.memberid : null

  // Filter discounts for dropdown
  const inhouseDiscounts = discounts.filter(d => d.type === 'I')

  const handleGenerateBill = async () => {
    setError(null)
    if (!form.orderid) {
      setError('Please select an order to bill.')
      return
    }

    let discountid = form.discountid

    // If Special ID Discount is selected, create a new discount record
    if (form.discountid === 'specialid') {
      if (!form.specialidType || !form.specialidNo) {
        setError('Please fill in all Special ID details.')
        return
      }
      if (form.specialidType === 'S' && !form.specialidBirthday) {
        setError('Please provide the birthday for Senior ID.')
        return
      }
      if (form.specialidType === 'P' && !form.specialidDisability) {
        setError('Please provide the disability for PWD ID.')
        return
      }

      // Create new discount record
      const { data: allDiscounts } = await supabase.from('discount').select('discountid')
      const maxId = allDiscounts && allDiscounts.length > 0 ? Math.max(...allDiscounts.map(d => d.discountid)) : 0
      const newDiscountId = maxId + 1

      // Insert into discount table
      const { error: discountError } = await supabase.from('discount').insert([{ discountid: newDiscountId, discounttype: 'S' }])
      if (discountError) {
        setError('Failed to insert into discount table: ' + discountError.message)
        return
      }

      // Insert into specialid table
      const specialidtype = form.specialidType === 'S' ? 'S' : 'P'
      const { error: specialidError } = await supabase.from('specialid').insert([{
        discountid: newDiscountId,
        memberid: selectedMemberId,
        discountrate: 0.12,
        specialidtype
      }])
      if (specialidError) {
        setError('Failed to insert into specialid table: ' + specialidError.message)
        return
      }

      // Insert into senior or pwd table
      if (form.specialidType === 'S') {
        const { error: seniorError } = await supabase.from('senior').insert([{
          discountid: newDiscountId,
          idno: form.specialidNo,
          idbirthday: form.specialidBirthday
        }])
        if (seniorError) {
          setError('Failed to insert into senior table: ' + seniorError.message)
          return
        }
      } else if (form.specialidType === 'P') {
        const { error: pwdError } = await supabase.from('pwd').insert([{
          discountid: newDiscountId,
          idno: form.specialidNo,
          disability: form.specialidDisability
        }])
        if (pwdError) {
          setError('Failed to insert into pwd table: ' + pwdError.message)
          return
        }
      }

      discountid = newDiscountId
    }

    // Find max billid and increment
    const { data: allBills } = await supabase.from('bill').select('billid')
    const maxId = allBills && allBills.length > 0 ? Math.max(...allBills.map(b => b.billid)) : 0
    const billid = maxId + 1

    const total = await calculateTotal(form.orderid, discountid, form.tax, form.servicefee)
    const { error: billError } = await supabase.from('bill').insert([{
      billid,
      discountid: discountid || null,
      tax: form.tax,
      servicefee: form.servicefee,
      total,
      outstandingbalance: total
    }])

    if (billError) {
      setError(billError.message)
      return
    }

    // Update the order to link to this bill
    await supabase.from('orders').update({ billid }).eq('ordersid', form.orderid)
    setForm({ 
      orderid: '', 
      discountid: '', 
      tax: 0.12, 
      servicefee: 0.00,
      specialidType: '',
      specialidNo: '',
      specialidBirthday: '',
      specialidDisability: ''
    })
    fetchBills()
    fetchDiscounts() // Refresh discounts to show the new one
  }

  const handleDelete = async billid => {
    // Delete the bill
    await supabase.from('bill').delete().eq('billid', billid)
    // Unlink bill from any orders
    await supabase.from('orders').update({ billid: null }).eq('billid', billid)
    fetchBills()
  }

  return (
    <div>
      <h2>Bills</h2>
      <div>
        <select name="orderid" value={form.orderid} onChange={handleChange} required>
          <option value="">Select Order</option>
          {orders.filter(o => !o.billid).map(o => (
            <option key={o.ordersid} value={o.ordersid}>Order #{o.ordersid}</option>
          ))}
        </select>
        <select name="discountid" value={form.discountid} onChange={handleChange}>
          <option value="">No Discount</option>
          {inhouseDiscounts.map(d => (
            <option key={d.discountid} value={d.discountid}>
              In-house: {d.discountdesc} ({d.discountrate * 100}%)
            </option>
          ))}
          <option value="specialid">Special ID Discount</option>
        </select>
        
        {form.discountid === 'specialid' && (
          <div>
            <select name="specialidType" value={form.specialidType} onChange={handleChange} required>
              <option value="">Select Type</option>
              <option value="S">Senior</option>
              <option value="P">PWD</option>
            </select>
            <input
              name="specialidNo"
              placeholder="ID Number"
              value={form.specialidNo}
              onChange={handleChange}
              required
              maxLength={12}
            />
            {form.specialidType === 'S' ? (
              <input
                name="specialidBirthday"
                type="date"
                value={form.specialidBirthday}
                onChange={handleChange}
                required
              />
            ) : form.specialidType === 'P' ? (
              <input
                name="specialidDisability"
                placeholder="Disability"
                value={form.specialidDisability}
                onChange={handleChange}
                required
              />
            ) : null}
          </div>
        )}
        
        <input
          name="tax"
          type="number"
          step="0.01"
          placeholder="Tax"
          value={form.tax}
          onChange={handleChange}
          title="Tax (e.g. 0.12 for 12%)"
        />
        <input
          name="servicefee"
          type="number"
          step="0.01"
          placeholder="Service Fee"
          value={form.servicefee}
          onChange={handleChange}
          title="Service Fee (e.g. 0.10 for 10%)"
        />
        <button onClick={handleGenerateBill}>Generate Bill</button>
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <ul>
        {bills.map(b => {
          const discount = discounts.find(d => d.discountid === b.discountid)
          return (
            <li key={b.billid}>
              Bill #{b.billid} | 
              Discount: {discount ? (
                discount.type === 'I' ? 
                  `In-house: ${discount.discountdesc} (${discount.discountrate * 100}%)` :
                  `Special ID: ${discount.subtype === 'S' ? 'Senior' : 'PWD'} (12%)`
              ) : b.discountid ? 'Special ID Discount (12%)' : 'None'} | 
              Tax: {b.tax} | 
              Service Fee: {b.servicefee} | 
              Total: ${b.total.toFixed(2)} | 
              Outstanding Balance: ${b.outstandingbalance !== undefined && b.outstandingbalance !== null ? b.outstandingbalance.toFixed(2) : 'N/A'}
              <button onClick={() => handleDelete(b.billid)}>Delete</button>
            </li>
          )
        })}
      </ul>
    </div>
  )
} 