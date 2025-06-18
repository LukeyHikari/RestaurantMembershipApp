import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Members() {
  const [members, setMembers] = useState([])
  const [form, setForm] = useState({ membername: '', memcontactno: '' })
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)

  const fetchMembers = async () => {
    const { data } = await supabase.from('member').select('*')
    setMembers(data || [])
  }

  useEffect(() => { fetchMembers() }, [])

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const generateMemberId = () => {
    let id = ''
    for (let i = 0; i < 12; i++) {
      id += Math.floor(Math.random() * 10)
    }
    return id
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError(null)
    if (editing) {
      const { error } = await supabase.from('member').update(form).eq('memberid', editing)
      if (error) setError(error.message)
      setEditing(null)
    } else {
      const memberid = generateMemberId()
      const { error } = await supabase.from('member').insert([{ memberid, ...form }])
      if (error) setError(error.message)
    }
    setForm({ membername: '', memcontactno: '' })
    fetchMembers()
  }

  const handleEdit = m => {
    setForm({ membername: m.membername, memcontactno: m.memcontactno })
    setEditing(m.memberid)
  }

  const handleDelete = async id => {
    await supabase.from('member').delete().eq('memberid', id)
    fetchMembers()
  }

  return (
    <div>
      <h2>Members</h2>
      <form onSubmit={handleSubmit}>
        <input name="membername" placeholder="Name" value={form.membername} onChange={handleChange} required />
        <input name="memcontactno" placeholder="Contact No" value={form.memcontactno} onChange={handleChange} required />
        <button type="submit">{editing ? 'Update' : 'Add'} Member</button>
        {editing && <button type="button" onClick={() => { setEditing(null); setForm({ membername: '', memcontactno: '' }) }}>Cancel</button>}
      </form>
      {error && <div style={{color: 'red'}}>{error}</div>}
      <ul>
        {members.map(m => (
          <li key={m.memberid}>
            {m.membername} ({m.memcontactno})
            <button onClick={() => handleEdit(m)}>Edit</button>
            <button onClick={() => handleDelete(m.memberid)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
} 