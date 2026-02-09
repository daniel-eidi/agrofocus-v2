import { Link, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div style={{fontFamily: 'system-ui, sans-serif', minHeight: '100vh'}}>
      <nav style={{background: '#166534', color: 'white', padding: '15px 20px'}}>
        <Link to="/" style={{color: 'white', textDecoration: 'none', fontSize: 24, fontWeight: 'bold'}}>🌱 AgroFocus</Link>
      </nav>
      
      <main>
        <Outlet />
      </main>
    </div>
  )
}
