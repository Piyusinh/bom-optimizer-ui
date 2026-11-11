import React, { useEffect, useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useUser } from '@/contexts/UserContext';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  listRoles,
} from '@/services/adminApi';
import type { AdminUser, UserCreateInput, UserUpdateInput, RoleOption } from '@/types/admin';

interface UserFormState {
  email: string;
  username: string;
  full_name: string;
  password: string;
  role_id: string;
  is_super_admin: boolean;
  is_active: boolean;
}

const emptyForm: UserFormState = {
  email: '',
  username: '',
  full_name: '',
  password: '',
  role_id: '',
  is_super_admin: false,
  is_active: true,
};

export const AdminUsers: React.FC = () => {
  const { user: currentUser } = useUser();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  // Debounce — wait for the user to stop typing before querying the API.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: users, loading, error, refetch } = useApiQuery<AdminUser[]>(
    () => listUsers(debouncedSearch || undefined),
    [debouncedSearch],
  );
  const { data: roles } = useApiQuery<RoleOption[]>(() => listRoles(), []);

  const { mutate: runCreate, loading: creating, error: createError } = useApiMutation<UserCreateInput, AdminUser>(
    (payload) => createUser(payload),
    { onSuccess: () => { setModalOpen(false); refetch(); } },
  );
  const { mutate: runUpdate, loading: updating, error: updateError } = useApiMutation<
    { id: string; payload: UserUpdateInput },
    AdminUser
  >(({ id, payload }) => updateUser(id, payload), { onSuccess: () => { setModalOpen(false); refetch(); } });
  const { mutate: runDelete } = useApiMutation<string, void>((id) => deleteUser(id), { onSuccess: () => refetch() });
  const { mutate: runReset, loading: resetting, error: resetError } = useApiMutation<
    { id: string; newPassword: string },
    void
  >(({ id, newPassword }) => resetUserPassword(id, newPassword), {
    onSuccess: () => { setResetTarget(null); setResetPassword(''); },
  });

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditingUser(u);
    setForm({
      email: u.email,
      username: u.username || '',
      full_name: u.full_name,
      password: '',
      role_id: u.role_id || '',
      is_super_admin: u.is_super_admin,
      is_active: u.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const isSelf = editingUser.id === currentUser?.id;
      await runUpdate({
        id: editingUser.id,
        payload: {
          email: form.email,
          username: form.username || undefined,
          full_name: form.full_name,
          is_active: form.is_active,
          // The backend rejects ANY self-update that includes role_id or
          // is_super_admin — even unchanged values — as a self-escalation
          // guard. Omit both fields entirely when editing your own account
          // so routine self-edits (e.g. renaming yourself) still succeed.
          ...(isSelf ? {} : { role_id: form.role_id || null, is_super_admin: form.is_super_admin }),
        },
      });
    } else {
      await runCreate({
        email: form.email,
        username: form.username || undefined,
        full_name: form.full_name,
        password: form.password,
        role_id: form.role_id || null,
        is_super_admin: form.is_super_admin,
        is_active: form.is_active,
      });
    }
  };

  const handleDelete = (u: AdminUser) => {
    if (u.id === currentUser?.id) return;
    if (window.confirm(`Delete user "${u.full_name}" (${u.email})? This cannot be undone.`)) {
      runDelete(u.id);
    }
  };

  return (
    <PageLayout pageName="Users">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Users</h2>
          <p className="text-sm text-gray-500 mt-1">Create users, assign a role, and control access.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          + New User
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full max-w-sm px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Last Login</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(users || []).map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.is_super_admin ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                        Super Admin
                      </span>
                    ) : (
                      <span className="text-gray-600">{u.role_label || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(u)} className="text-blue-600 hover:underline text-xs font-medium">
                      Edit
                    </button>
                    <button
                      onClick={() => setResetTarget(u)}
                      className="text-amber-600 hover:underline text-xs font-medium"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={u.id === currentUser?.id}
                      className="text-red-600 hover:underline text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {(users || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} title={editingUser ? 'Edit User' : 'New User'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username (optional)</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                At least 8 characters, with uppercase, lowercase, a digit, and a special character.
              </p>
            </div>
          )}
          {(() => {
            const isSelf = !!editingUser && editingUser.id === currentUser?.id;
            return (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={form.role_id}
                    onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
                    disabled={form.is_super_admin || isSelf}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">— No role —</option>
                    {(roles || []).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className={`flex items-center gap-2 text-sm text-gray-700 ${isSelf ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={form.is_super_admin}
                      disabled={isSelf}
                      onChange={(e) => setForm((f) => ({ ...f, is_super_admin: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    Super Admin
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    Active
                  </label>
                </div>
                {isSelf && (
                  <p className="text-xs text-amber-600">
                    You cannot change your own role or super admin status.
                  </p>
                )}
              </>
            );
          })()}

          {(createError || updateError) && (
            <p className="text-sm text-red-600">{createError || updateError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || updating}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {editingUser ? (updating ? 'Saving...' : 'Save Changes') : creating ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetTarget} title={`Reset Password — ${resetTarget?.full_name || ''}`} onClose={() => setResetTarget(null)}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (resetTarget) runReset({ id: resetTarget.id, newPassword: resetPassword });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              At least 8 characters, with uppercase, lowercase, a digit, and a special character.
            </p>
          </div>
          {resetError && <p className="text-sm text-red-600">{resetError}</p>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setResetTarget(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resetting}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
};
