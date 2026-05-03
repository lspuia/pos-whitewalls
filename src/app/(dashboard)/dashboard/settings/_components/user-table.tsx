'use client'

import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { changeUserRole, toggleUserActive } from '../actions'
import type { Role } from '@/lib/types'

const ROLES: { value: Role; label: string }[] = [
  { value: 'sales_staff', label: 'Sales staff' },
  { value: 'manager',     label: 'Manager'     },
  { value: 'admin',       label: 'Admin'       },
  { value: 'super_admin', label: 'Super admin' },
]

export type UserRow = {
  id:        string
  full_name: string | null
  email:     string
  role:      Role
  is_active: boolean
}

interface Props {
  users:         UserRow[]
  currentUserId: string
}

export function UserTable({ users, currentUserId }: Props) {
  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              isSelf={u.id === currentUserId}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UserRow({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [role, setRole]      = useState<Role>(user.role)
  const [isPending, startTransition] = useTransition()

  function handleRoleChange(newRole: Role) {
    setRole(newRole)
    startTransition(async () => {
      const result = await changeUserRole(user.id, newRole)
      if (result?.error) {
        toast.error(result.error)
        setRole(user.role)
      } else {
        toast.success('Role updated.')
      }
    })
  }

  function handleToggleActive() {
    const next = !user.is_active
    startTransition(async () => {
      const result = await toggleUserActive(user.id, next)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(next ? 'User activated.' : 'User deactivated.')
      }
    })
  }

  return (
    <tr className={`${!user.is_active ? 'opacity-50' : ''}`}>
      <td className="px-4 py-3 font-medium text-gray-900">
        {user.full_name ?? '—'}
        {isSelf && (
          <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
            you
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500">{user.email}</td>
      <td className="px-4 py-3">
        {isSelf ? (
          <span className="text-gray-700">{ROLES.find((r) => r.value === role)?.label ?? role}</span>
        ) : (
          <select
            value={role}
            disabled={isPending}
            onChange={(e) => handleRoleChange(e.target.value as Role)}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:opacity-50"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            user.is_active
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3">
        {isSelf ? (
          <span className="text-xs text-gray-400">—</span>
        ) : (
          <button
            onClick={handleToggleActive}
            disabled={isPending}
            className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-50"
          >
            {user.is_active ? 'Deactivate' : 'Activate'}
          </button>
        )}
      </td>
    </tr>
  )
}
