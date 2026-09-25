import { Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import Home from './pages/Home.jsx'
import Repository from './pages/Repository.jsx'
import Expeditions from './pages/Expeditions.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import NotFound from './pages/NotFound.jsx'
import Dashboard from './pages/Dashboard.jsx'
import RepositoryDetail from './pages/RepositoryDetail.jsx'
import ResourceForm from './pages/ResourceForm.jsx'
import ExpeditionDetail from './pages/ExpeditionDetail.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="repository" element={<Repository />} />
        <Route path="expeditions" element={<Expeditions />} />
        <Route path="expeditions/:id" element={<ExpeditionDetail />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="repository/:id" element={<RepositoryDetail />} />
        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="dashboard/new" element={<ResourceForm />} />
          <Route path="dashboard/:id/edit" element={<ResourceForm />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
