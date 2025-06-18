import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Discounts() {
  const [discounts, setDiscounts] = useState([])
  const [members, setMembers] = useState([])
  const [activeTab, setActiveTab] = useState('inhouse') // 'inhouse' or 'specialid'
  const [form, setForm] = useState({
    discounttype: 'I', // I for inhouse, S for specialid
    discountdesc: '',
    discountrate: 0.00,
    memberid: '',
    idno: '',
    idbirthday: '',
    disability: ''
  })
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDiscounts()
    supabase.from('member').select('*').then(({ data }) => setMembers(data || []))
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

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError(null)

    try {
      if (editing) {
        // Update existing discount
        if (form.discounttype === 'I') {
          await supabase.from('inhouse').update({
            discountdesc: form.discountdesc,
            discountrate: parseFloat(form.discountrate)
          }).eq('discountid', editing)
        } else {
          if (form.subtype === 'S') {
            await supabase.from('senior').update({
              idno: form.idno,
              idbirthday: form.idbirthday
            }).eq('discountid', editing)
          } else if (form.subtype === 'P') {
            await supabase.from('pwd').update({
              idno: form.idno,
              disability: form.disability
            }).eq('discountid', editing)
          }
        }
      } else {
        // Create new discount
        const { data: allDiscounts } = await supabase.from('discount').select('discountid')
        const maxId = allDiscounts && allDiscounts.length > 0 ? Math.max(...allDiscounts.map(d => d.discountid)) : 0
        const discountid = maxId + 1

        // Insert into discount table
        await supabase.from('discount').insert([{ discountid, discounttype: form.discounttype }])

        if (form.discounttype === 'I') {
          // Insert into inhouse
          await supabase.from('inhouse').insert([{
            discountid,
            discountdesc: form.discountdesc,
            discountrate: parseFloat(form.discountrate)
          }])
        } else {
          // Insert into specialid
          await supabase.from('specialid').insert([{
            discountid,
            memberid: form.memberid,
            discountrate: 0.12
          }])

          if (form.subtype === 'S') {
            // Insert into senior
            await supabase.from('senior').insert([{
              discountid,
              idno: form.idno,
              idbirthday: form.idbirthday
            }])
          } else if (form.subtype === 'P') {
            // Insert into pwd
            await supabase.from('pwd').insert([{
              discountid,
              idno: form.idno,
              disability: form.disability
            }])
          }
        }
      }

      setForm({
        discounttype: 'I',
        discountdesc: '',
        discountrate: 0.00,
        memberid: '',
        idno: '',
        idbirthday: '',
        disability: ''
      })
      setEditing(null)
      fetchDiscounts()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEdit = d => {
    setForm({
      discounttype: d.type,
      discountdesc: d.discountdesc || '',
      discountrate: d.discountrate || 0.00,
      memberid: d.memberid || '',
      idno: d.idno || '',
      idbirthday: d.idbirthday || '',
      disability: d.disability || '',
      subtype: d.subtype
    })
    setEditing(d.discountid)
  }

  const handleDelete = async id => {
    await supabase.from('discount').delete().eq('discountid', id)
    fetchDiscounts()
  }

  // Filter discounts based on active tab
  const inhouseDiscounts = discounts.filter(d => d.type === 'I')
  const specialidDiscounts = discounts.filter(d => d.type === 'S')

  return (
    <div>
      <h2>Discounts</h2>
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('inhouse')}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: activeTab === 'inhouse' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'inhouse' ? 'white' : 'black',
            border: '1px solid #ddd',
            cursor: 'pointer'
          }}
        >
          In-house Discounts
        </button>
        <button 
          onClick={() => setActiveTab('specialid')}
          style={{ 
            padding: '10px 20px',
            backgroundColor: activeTab === 'specialid' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'specialid' ? 'white' : 'black',
            border: '1px solid #ddd',
            cursor: 'pointer'
          }}
        >
          Special ID Records
        </button>
      </div>

      {/* In-house Discounts Section */}
      {activeTab === 'inhouse' && (
        <div>
          <h3>Add In-house Discount</h3>
          <form onSubmit={handleSubmit}>
            <input
              name="discountdesc"
              placeholder="Discount Description"
              value={form.discountdesc}
              onChange={handleChange}
              required
            />
            <input
              name="discountrate"
              type="number"
              step="0.01"
              placeholder="Discount Rate"
              value={form.discountrate}
              onChange={handleChange}
              required
            />
            <button type="submit">{editing ? 'Update' : 'Add'} In-house Discount</button>
            {editing && (
              <button type="button" onClick={() => {
                setEditing(null)
                setForm({
                  discounttype: 'I',
                  discountdesc: '',
                  discountrate: 0.00,
                  memberid: '',
                  idno: '',
                  idbirthday: '',
                  disability: ''
                })
              }}>
                Cancel
              </button>
            )}
          </form>
          
          <h3>In-house Discounts</h3>
          <ul>
            {inhouseDiscounts.map(d => (
              <li key={d.discountid}>
                {d.discountdesc} ({d.discountrate * 100}%)
                <button onClick={() => handleEdit(d)}>Edit</button>
                <button onClick={() => handleDelete(d.discountid)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Special ID Records Section */}
      {activeTab === 'specialid' && (
        <div>
          <h3>Special ID Records</h3>
          <p>This shows all special ID discounts that have been created and used by members.</p>
          
          <ul>
            {specialidDiscounts.map(d => {
              const member = members.find(m => m.memberid === d.memberid)
              return (
                <li key={d.discountid}>
                  <strong>Member:</strong> {member ? member.membername : d.memberid} ({d.memberid}) | 
                  <strong>Type:</strong> {d.subtype === 'S' ? 'Senior' : 'PWD'} | 
                  <strong>ID:</strong> {d.idno} | 
                  {d.subtype === 'S' ? (
                    <><strong>Birthday:</strong> {d.idbirthday}</>
                  ) : (
                    <><strong>Disability:</strong> {d.disability}</>
                  )} | 
                  <strong>Rate:</strong> 12%
                </li>
              )
            })}
          </ul>
          
          {specialidDiscounts.length === 0 && (
            <p>No special ID records found.</p>
          )}
        </div>
      )}

      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  )
} 