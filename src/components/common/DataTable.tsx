import type { ReactNode } from 'react';

interface DataTableColumn<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  items: T[];
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({ columns, items, loading = false, emptyMessage = 'No records found.' }: DataTableProps<T>) {
  if (loading) {
    return <div className="flex min-h-[200px] items-center justify-center text-slate-500">Loading…</div>;
  }
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <table className="w-full text-left border-b border-slate-100">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50"
              >
                {col.label}
              </th>
            ))}
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, index) => (
            <tr key={index} className="hover:bg-slate-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-slate-700 border-b border-slate-50">
                  {col.render ? col.render(item) : String(item[col.key as keyof T])}
                </td>
              ))}
              <td className="px-4 py-3 text-sm text-slate-700 border-b border-slate-50">
                <div className="flex gap-2">
                  <button className="px-2 py-1 text-xs text-orange-600 hover:underline">Edit</button>
                  <button className="px-2 py-1 text-xs text-red-600 hover:underline">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
