import React, { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useApiMutation } from '@/hooks/useApiMutation';
import { listRoles, createRole, updateRole, deleteRole, listPages } from '@/services/adminApi';
import type { RoleOption, RoleCreateInput, RoleUpdateInput, PageNode } from '@/types/admin';

interface RoleFormState {
  name: string;
  label: string;
  description: string;
  page_ids: string[];
}

const emptyForm: RoleFormState = { name: '', label: '', description: '', page_ids: [] };

/** Renders the page tree as a checkbox list so a super admin can build a role's permissions. */
const PageCheckboxTree: React.FC<{
  pages: PageNode[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}> = ({ pages, selected, onToggle }) => {
  const roots = pages.filter((p) => !p.parent_id);
  const childrenOf = (parentId: string) => pages.filter((p) => p.parent_id === parentId);

  const visited = new Set<string>();
  const renderNode = (page: PageNode, depth: number) => {
    if (visited.has(page.id)) return null; // cycle guard
    visited.add(page.id);
    const children = childrenOf(page.id);
    return (
      <div key={page.id}>
        <label className={`flex items-center gap-2 py-1.5 text-sm text-gray-700 ${depth > 0 ? 'ml-6' : ''}`}>
          <input
            type="checkbox"
            checked={selected.has(page.id)}
            onChange={() => onToggle(page.id)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <span className={depth === 0 ? 'font-medium' : ''}>{page.label}</span>
          <span className="text-xs text-gray-400">{page.key}</span>
        </label>
        {children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">{roots.map((r) => renderNode(r, 0))}</div>;
};

export const AdminRoles: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleOption | null>(null);
  const [form, setForm] = useState<RoleFormState>(emptyForm);

  const { data: roles, loading, error, refetch } = useApiQuery<RoleOption[]>(() => listRoles(), []);
  const { data: pages } = useApiQuery<PageNode[]>(() => listPages(), []);

  const { mutate: runCreate, loading: creating, error: createError } = useApiMutation<RoleCreateInput, RoleOption>(
    (payload) => createRole(payload),
    { onSuccess: () => { setModalOpen(false); refetch(); } },
  );
  const { mutate: runUpdate, loading: updating, error: updateError } = useApiMutation<
    { id: string; payload: RoleUpdateInput },
    RoleOption
  >(({ id, payload }) => updateRole(id, payload), { onSuccess: () => { setModalOpen(false); refetch(); } });
  const { mutate: runDelete, error: deleteError } = useApiMutation<string, void>(
    (id) => deleteRole(id),
    { onSuccess: () => refetch() },
  );

  const openCreate = () => {
    setEditingRole(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (r: RoleOption) => {
    setEditingRole(r);
    setForm({ name: r.name, label: r.label, description: r.description || '', page_ids: [...r.page_ids] });
    setModalOpen(true);
  };

  const togglePage = (pageId: string) => {
    setForm((f) => ({
      ...f,
      page_ids: f.page_ids.includes(pageId)
        ? f.page_ids.filter((id) => id !== pageId)
        : [...f.page_ids, pageId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole) {
      await runUpdate({
        id: editingRole.id,
        payload: { label: form.label, description: form.description || undefined, page_ids: form.page_ids },
      });
    } else {
      await runCreate({
        name: form.name,
        label: form.label,
        description: form.description || undefined,
        page_ids: form.page_ids,
      });
    }
  };

  const handleDelete = (r: RoleOption) => {
    if (r.is_system) return;
    if (window.confirm(`Delete role "${r.label}"? This cannot be undone.`)) {
      runDelete(r.id);
    }
  };

  return (
    <PageLayout pageName="Roles">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Roles</h2>
          <p className="text-sm text-gray-500 mt-1">Define permission bundles and grant them access to pages.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          + New Role
        </button>
      </div>

      {deleteError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{deleteError}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Pages Granted</th>
                <th className="text-left px-4 py-3">Users</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(roles || []).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.label}</div>
                    <div className="text-xs text-gray-400">{r.name}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.description || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.page_ids.length}</td>
                  <td className="px-4 py-3 text-gray-600">{r.user_count}</td>
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(r)} className="text-blue-600 hover:underline text-xs font-medium">
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      disabled={r.is_system}
                      title={r.is_system ? 'Built-in roles cannot be deleted' : ''}
                      className="text-red-600 hover:underline text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} title={editingRole ? 'Edit Role' : 'New Role'} onClose={() => setModalOpen(false)} widthClass="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingRole && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role Key</label>
              <input
                type="text"
                required
                placeholder="e.g. quality_manager"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              required
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Page Access</label>
            <PageCheckboxTree
              pages={pages || []}
              selected={new Set(form.page_ids)}
              onToggle={togglePage}
            />
          </div>

          {(createError || updateError) && <p className="text-sm text-red-600">{createError || updateError}</p>}

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
              {editingRole ? (updating ? 'Saving...' : 'Save Changes') : creating ? 'Creating...' : 'Create Role'}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
};
