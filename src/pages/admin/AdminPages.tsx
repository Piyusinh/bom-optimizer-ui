import React, { useMemo, useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useApiMutation } from '@/hooks/useApiMutation';
import { listPages, createPage, updatePage, deletePage } from '@/services/adminApi';
import type { PageNode, PageCreateInput, PageUpdateInput } from '@/types/admin';

interface PageFormState {
  key: string;
  label: string;
  icon: string;
  parent_id: string;
  sort_order: number;
  is_menu: boolean;
  is_active: boolean;
}

const emptyForm: PageFormState = { key: '', label: '', icon: '', parent_id: '', sort_order: 0, is_menu: true, is_active: true };

const ICON_OPTIONS = [
  'dashboard', 'factory', 'beaker', 'clipboard', 'database', 'book', 'doc', 'shield', 'users', 'key', 'menu',
];

/** Sorted flat rows with indentation depth, so submenus render visibly nested under their parent. */
function flattenTree(pages: PageNode[]): Array<{ page: PageNode; depth: number }> {
  const byParent = new Map<string | null, PageNode[]>();
  for (const p of pages) {
    const key = p.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(p);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.sort_order - b.sort_order);

  const rows: Array<{ page: PageNode; depth: number }> = [];
  const visited = new Set<string>();
  const walk = (parentId: string | null, depth: number) => {
    for (const p of byParent.get(parentId) || []) {
      if (visited.has(p.id)) continue; // cycle guard
      visited.add(p.id);
      rows.push({ page: p, depth });
      walk(p.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}

export const AdminPages: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<PageNode | null>(null);
  const [form, setForm] = useState<PageFormState>(emptyForm);

  const { data: pages, loading, error, refetch } = useApiQuery<PageNode[]>(() => listPages(), []);

  const { mutate: runCreate, loading: creating, error: createError } = useApiMutation<PageCreateInput, PageNode>(
    (payload) => createPage(payload),
    { onSuccess: () => { setModalOpen(false); refetch(); } },
  );
  const { mutate: runUpdate, loading: updating, error: updateError } = useApiMutation<
    { id: string; payload: PageUpdateInput },
    PageNode
  >(({ id, payload }) => updatePage(id, payload), { onSuccess: () => { setModalOpen(false); refetch(); } });
  const { mutate: runDelete, error: deleteError } = useApiMutation<string, void>(
    (id) => deletePage(id),
    { onSuccess: () => refetch() },
  );

  const rows = flattenTree(pages || []);

  // A page's descendants cannot be chosen as its parent — that would create
  // a cycle. Compute them once so the dropdown only offers valid parents.
  const descendantIds = useMemo(() => {
    const out = new Set<string>();
    if (!editingPage || !pages) return out;
    const childrenOf = new Map<string, string[]>();
    for (const p of pages) {
      if (!p.parent_id) continue;
      const list = childrenOf.get(p.parent_id) || [];
      list.push(p.id);
      childrenOf.set(p.parent_id, list);
    }
    const stack = [editingPage.id];
    while (stack.length) {
      const id = stack.pop()!;
      if (out.has(id)) continue;
      out.add(id);
      for (const c of childrenOf.get(id) || []) stack.push(c);
    }
    return out;
  }, [editingPage, pages]);

  const openCreate = (parentId?: string) => {
    setEditingPage(null);
    setForm({ ...emptyForm, parent_id: parentId || '' });
    setModalOpen(true);
  };

  const openEdit = (p: PageNode) => {
    setEditingPage(p);
    setForm({
      key: p.key,
      label: p.label,
      icon: p.icon || '',
      parent_id: p.parent_id || '',
      sort_order: p.sort_order,
      is_menu: p.is_menu,
      is_active: p.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      key: form.key.trim(),
      label: form.label,
      icon: form.icon || undefined,
      parent_id: form.parent_id || null,
      sort_order: Number(form.sort_order) || 0,
      is_menu: form.is_menu,
      is_active: form.is_active,
    };
    if (editingPage) {
      await runUpdate({ id: editingPage.id, payload });
    } else {
      await runCreate(payload as PageCreateInput);
    }
  };

  const handleDelete = (p: PageNode) => {
    if (p.is_system) return;
    if (window.confirm(`Delete page "${p.label}" (${p.key})?`)) {
      runDelete(p.id);
    }
  };

  return (
    <PageLayout pageName="Pages & Menus">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pages &amp; Menus</h2>
          <p className="text-sm text-gray-500 mt-1">
            Every sidebar entry is a row here. Give a page a parent to make it a submenu.
          </p>
        </div>
        <button
          onClick={() => openCreate()}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          + New Page
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
                <th className="text-left px-4 py-3">Page</th>
                <th className="text-left px-4 py-3">Key</th>
                <th className="text-left px-4 py-3">Icon</th>
                <th className="text-left px-4 py-3">Sort</th>
                <th className="text-left px-4 py-3">Menu?</th>
                <th className="text-left px-4 py-3">Active?</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(({ page: p, depth }) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900" style={{ paddingLeft: `${16 + depth * 24}px` }}>
                    {depth > 0 && <span className="text-gray-300 mr-1">↳</span>}
                    {p.label}
                    {p.is_system && (
                      <span className="ml-2 inline-flex px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-medium">
                        built-in
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.key}</td>
                  <td className="px-4 py-3 text-gray-600">{p.icon || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.sort_order}</td>
                  <td className="px-4 py-3">{p.is_menu ? '✓' : '—'}</td>
                  <td className="px-4 py-3">{p.is_active ? '✓' : '—'}</td>
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => openCreate(p.id)}
                      className="text-green-600 hover:underline text-xs font-medium"
                      title="Add a submenu page under this one"
                    >
                      + Submenu
                    </button>
                    <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs font-medium">
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      disabled={p.is_system}
                      title={p.is_system ? 'Built-in pages cannot be deleted' : ''}
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

      <Modal open={modalOpen} title={editingPage ? 'Edit Page' : 'New Page'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Route Key</label>
            <input
              type="text"
              required
              placeholder="/example-page"
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
            <input
              type="text"
              required
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
            <select
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">— default —</option>
              {ICON_OPTIONS.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Page (leave empty for top-level)</label>
            <select
              value={form.parent_id}
              onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">— top level —</option>
              {(pages || [])
                .filter((p) => !descendantIds.has(p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end pb-2 gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_menu}
                  onChange={(e) => setForm((f) => ({ ...f, is_menu: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                Show in sidebar
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
              {editingPage ? (updating ? 'Saving...' : 'Save Changes') : creating ? 'Creating...' : 'Create Page'}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
};
