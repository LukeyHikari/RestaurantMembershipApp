import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function MemberHistory() {
  const [members, setMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState('')
  const [historyEntries, setHistoryEntries] = useState([])
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [dishes, setDishes] = useState([])
  const [orderItems, setOrderItems] = useState([])
  const [bills, setBills] = useState([])
  const [activeTab, setActiveTab] = useState('history') // 'history' or 'analytics'
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchMembers()
    fetchOrders()
    fetchPayments()
    fetchDishes()
    fetchOrderItems()
    fetchBills()
  }, [])

  useEffect(() => {
    if (selectedMember) {
      fetchMemberHistory(selectedMember)
    } else {
      setHistoryEntries([])
    }
  }, [selectedMember])

  const fetchMembers = async () => {
    const { data } = await supabase.from('member').select('*')
    setMembers(data || [])
  }

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*')
    setOrders(data || [])
  }

  const fetchPayments = async () => {
    const { data } = await supabase.from('payment').select('*')
    setPayments(data || [])
  }

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

  const fetchMemberHistory = async (memberid) => {
    const { data } = await supabase.from('memberhistory').select('*').eq('memberid', memberid).order('eventdate', { ascending: false })
    setHistoryEntries(data || [])
  }

  const getEventDetails = (entry) => {
    if (entry.eventtype === 'order') {
      const order = orders.find(o => o.ordersid === entry.ordersid)
      return order ? `Order #${entry.ordersid} - ${order.orderdate}` : `Order #${entry.ordersid}`
    } else if (entry.eventtype === 'payment') {
      const payment = payments.find(p => p.paymentid === entry.paymentid)
      return payment ? `Payment #${entry.paymentid} - $${payment.paidamount} (${payment.paymentoption})` : `Payment #${entry.paymentid}`
    }
    return 'Unknown event'
  }

  // Analytics calculations
  const getMemberAnalytics = () => {
    if (!selectedMember) return null

    const memberOrders = orders.filter(o => o.memberid === selectedMember)
    const memberBills = bills.filter(b => {
      // Check if any member order is linked to this bill
      return memberOrders.some(o => o.billid === b.billid)
    })
    const memberPayments = payments.filter(p => p.memberid === selectedMember)

    // Most ordered dishes
    const dishFrequency = {}
    memberOrders.forEach(order => {
      const items = orderItems.filter(item => item.ordersid === order.ordersid)
      items.forEach(item => {
        const dish = dishes.find(d => d.dishid === item.dishid)
        if (dish) {
          dishFrequency[dish.dishname] = (dishFrequency[dish.dishname] || 0) + item.quantity
        }
      })
    })
    const mostOrderedDishes = Object.entries(dishFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([dish, count]) => ({ dish, count }))

    // Payment frequency
    const fullPayments = memberPayments.filter(p => p.paymentstatus === 'paid').length
    const partialPayments = memberPayments.filter(p => p.paymentstatus === 'partial').length
    const totalPayments = memberPayments.length

    // Order totals
    const orderTotals = memberBills.map(bill => bill.total)
    const averageOrderTotal = orderTotals.length > 0 ? orderTotals.reduce((sum, total) => sum + total, 0) / orderTotals.length : 0
    const highestOrderTotal = orderTotals.length > 0 ? Math.max(...orderTotals) : 0
    const lowestOrderTotal = orderTotals.length > 0 ? Math.min(...orderTotals) : 0

    return {
      mostOrderedDishes,
      fullPayments,
      partialPayments,
      totalPayments,
      averageOrderTotal,
      highestOrderTotal,
      lowestOrderTotal,
      totalOrders: memberOrders.length
    }
  }

  const analytics = getMemberAnalytics()

  return (
    <div>
      <h2>Member History</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <select 
          value={selectedMember} 
          onChange={(e) => setSelectedMember(e.target.value)}
          style={{ padding: '8px', marginRight: '10px' }}
        >
          <option value="">Select a Member</option>
          {members.map(member => (
            <option key={member.memberid} value={member.memberid}>
              {member.membername} ({member.memberid})
            </option>
          ))}
        </select>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

      {selectedMember && (
        <div>
          <h3>Member: {members.find(m => m.memberid === selectedMember)?.membername}</h3>
          
          {/* Tab Navigation */}
          <div style={{ marginBottom: '20px' }}>
            <button 
              onClick={() => setActiveTab('history')}
              style={{ 
                padding: '10px 20px', 
                marginRight: '10px',
                backgroundColor: activeTab === 'history' ? '#007bff' : '#f8f9fa',
                color: activeTab === 'history' ? 'white' : 'black',
                border: '1px solid #ddd',
                cursor: 'pointer'
              }}
            >
              History
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

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              {historyEntries.length === 0 ? (
                <p>No history entries found for this member.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Event Type</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Event Details</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyEntries.map(entry => (
                      <tr key={entry.historyid}>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '12px',
                            backgroundColor: entry.eventtype === 'order' ? '#e3f2fd' : '#f3e5f5',
                            color: entry.eventtype === 'order' ? '#1976d2' : '#7b1fa2'
                          }}>
                            {entry.eventtype.charAt(0).toUpperCase() + entry.eventtype.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          {getEventDetails(entry)}
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          {new Date(entry.eventdate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && analytics && (
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Order Statistics */}
                <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
                  <h4 style={{ marginTop: 0, color: '#000', fontWeight: 'bold', fontSize: '16px' }}>Order Statistics</h4>
                  <p style={{ color: '#000', margin: '8px 0', fontSize: '14px' }}><strong>Total Orders:</strong> {analytics.totalOrders}</p>
                  <p style={{ color: '#000', margin: '8px 0', fontSize: '14px' }}><strong>Average Order Total:</strong> ${analytics.averageOrderTotal.toFixed(2)}</p>
                  <p style={{ color: '#000', margin: '8px 0', fontSize: '14px' }}><strong>Highest Order Total:</strong> ${analytics.highestOrderTotal.toFixed(2)}</p>
                  <p style={{ color: '#000', margin: '8px 0', fontSize: '14px' }}><strong>Lowest Order Total:</strong> ${analytics.lowestOrderTotal.toFixed(2)}</p>
                </div>

                {/* Payment Statistics */}
                <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
                  <h4 style={{ marginTop: 0, color: '#000', fontWeight: 'bold', fontSize: '16px' }}>Payment Statistics</h4>
                  <p style={{ color: '#000', margin: '8px 0', fontSize: '14px' }}><strong>Total Payments:</strong> {analytics.totalPayments}</p>
                  <p style={{ color: '#000', margin: '8px 0', fontSize: '14px' }}><strong>Full Payments:</strong> {analytics.fullPayments}</p>
                  <p style={{ color: '#000', margin: '8px 0', fontSize: '14px' }}><strong>Partial Payments:</strong> {analytics.partialPayments}</p>
                  <p style={{ color: '#000', margin: '8px 0', fontSize: '14px' }}><strong>Payment Completion Rate:</strong> {analytics.totalPayments > 0 ? ((analytics.fullPayments / analytics.totalPayments) * 100).toFixed(1) : 0}%</p>
                </div>
              </div>

              {/* Most Ordered Dishes */}
              <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
                <h4 style={{ marginTop: 0, color: '#000', fontWeight: 'bold', fontSize: '16px' }}>Most Ordered Dishes</h4>
                {analytics.mostOrderedDishes.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e9ecef' }}>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#000' }}>Dish</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#000' }}>Times Ordered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.mostOrderedDishes.map((item, index) => (
                        <tr key={index} style={{ backgroundColor: '#ffffff' }}>
                          <td style={{ border: '1px solid #ddd', padding: '8px', color: '#000' }}>{item.dish}</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px', color: '#000' }}>{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#000' }}>No order data available.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 