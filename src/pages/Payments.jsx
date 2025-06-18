import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [members, setMembers] = useState([])
  const [bills, setBills] = useState([])
  const [form, setForm] = useState({
    memberid: '',
    billid: '',
    paymentoption: '',
    paymentdate: '',
    paidamount: ''
  })
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPayments()
    supabase.from('member').select('*').then(({ data }) => setMembers(data || []))
    supabase.from('bill').select('*').then(({ data }) => setBills(data || []))
  }, [])

  const fetchPayments = async () => {
    const { data } = await supabase.from('payment').select('*')
    setPayments(data || [])
  }

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setError(null)
    // Validation
    if (!form.memberid || !form.billid || !form.paymentoption || !form.paymentdate || !form.paidamount) {
      setError('Please fill in all required fields.')
      return
    }
    // Find max paymentid and increment
    const { data: allPayments } = await supabase.from('payment').select('paymentid')
    const maxId = allPayments && allPayments.length > 0 ? Math.max(...allPayments.map(p => p.paymentid)) : 0
    const paymentid = maxId + 1
    // Fetch the bill to get outstandingbalance and total
    const { data: billData } = await supabase.from('bill').select('*').eq('billid', form.billid)
    let newOutstanding = null
    let paymentstatus = 'partial'
    let outstandingbalance = null
    if (billData && billData[0]) {
      outstandingbalance = billData[0].outstandingbalance !== undefined && billData[0].outstandingbalance !== null ? billData[0].outstandingbalance : billData[0].total
      newOutstanding = outstandingbalance - parseFloat(form.paidamount)
      if (newOutstanding < 0) newOutstanding = 0
      paymentstatus = newOutstanding === 0 ? 'paid' : 'partial'
    }
    // Insert payment
    const { error: paymentError } = await supabase.from('payment').insert([{
      paymentid,
      memberid: form.memberid,
      billid: form.billid,
      paymentoption: form.paymentoption,
      paymentdate: form.paymentdate,
      paidamount: parseFloat(form.paidamount),
      paymentstatus,
      outstandingbalance: newOutstanding
    }])
    if (paymentError) {
      setError(paymentError.message)
      return
    }
    // Update bill outstandingbalance
    if (billData && billData[0]) {
      await supabase.from('bill').update({ outstandingbalance: newOutstanding }).eq('billid', form.billid)
    }

    // Create memberhistory entry for the payment
    const { data: allHistory } = await supabase.from('memberhistory').select('historyid')
    const maxHistoryId = allHistory && allHistory.length > 0 ? Math.max(...allHistory.map(h => h.historyid)) : 0
    const historyid = maxHistoryId + 1
    
    await supabase.from('memberhistory').insert([{
      historyid,
      memberid: form.memberid,
      ordersid: null,
      paymentid,
      eventdate: new Date().toISOString(),
      eventtype: 'payment'
    }])

    setForm({ memberid: '', billid: '', paymentoption: '', paymentdate: '', paidamount: '' })
    fetchPayments()
    supabase.from('bill').select('*').then(({ data }) => setBills(data || []))
  }

  const handleEdit = p => {
    setForm({
      memberid: p.memberid,
      billid: p.billid,
      paymentoption: p.paymentoption,
      paymentdate: p.paymentdate || '',
      paidamount: p.paidamount || ''
    })
    setEditing(p.paymentid)
  }

  return (
    <div>
      <h2>Payments</h2>
      <form onSubmit={handleSubmit}>
        <select name="memberid" value={form.memberid} onChange={handleChange} required>
          <option value="">Select Member</option>
          {members.map(m => (
            <option key={m.memberid} value={m.memberid}>{m.membername} ({m.memberid})</option>
          ))}
        </select>
        <select name="billid" value={form.billid} onChange={handleChange} required>
          <option value="">Select Bill</option>
          {bills.filter(b => (b.outstandingbalance !== null && b.outstandingbalance !== undefined && b.outstandingbalance > 0)).map(b => (
            <option key={b.billid} value={b.billid}>Bill #{b.billid} (Total: ${b.total}, Outstanding: ${b.outstandingbalance.toFixed(2)})</option>
          ))}
        </select>
        <select name="paymentoption" value={form.paymentoption} onChange={handleChange} required>
          <option value="">Select Payment Option</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="e-wallet">E-wallet</option>
          <option value="points">Points</option>
        </select>
        <input
          name="paymentdate"
          type="date"
          value={form.paymentdate}
          onChange={handleChange}
          required
        />
        <input
          name="paidamount"
          type="number"
          step="0.01"
          placeholder="Paid Amount"
          value={form.paidamount}
          onChange={handleChange}
          required
        />
        <button type="submit">{editing ? 'Update' : 'Add'} Payment</button>
        {editing && <button type="button" onClick={() => { setEditing(null); setForm({ memberid: '', billid: '', paymentoption: '', paymentdate: '', paidamount: '' }) }}>Cancel</button>}
      </form>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <h3>All Payments</h3>
      <ul>
        {payments.map(p => {
          const member = members.find(m => m.memberid === p.memberid)
          const bill = bills.find(b => b.billid === p.billid)
          return (
            <li key={p.paymentid}>
              Payment #{p.paymentid} | Member: {member ? member.membername : p.memberid} | Bill: {p.billid} | Option: {p.paymentoption} | Status: {p.paymentstatus} | Date: {p.paymentdate || 'N/A'} | Paid: {p.paidamount !== null && p.paidamount !== undefined ? `$${p.paidamount}` : 'N/A'} | Outstanding Balance: {p.outstandingbalance !== undefined && p.outstandingbalance !== null ? `$${p.outstandingbalance.toFixed(2)}` : 'N/A'}
              <button onClick={() => handleEdit(p)}>Edit</button>
            </li>
          )
        })}
      </ul>
    </div>
  )
} 