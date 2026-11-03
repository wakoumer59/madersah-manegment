import { translate  } from '@/i18n';
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
  renderActions?: (item: T) => ReactNode;
}

export function DataTable<T>({
  columns, items, loading = false, emptyMessage = 'No records found.', renderActions,
}: DataTableProps<T>) {
  if (loading) {
    return <div className="flex min-h-[200px] items-center justify-center text-slate-500">{translate("Loading…")}</div>;
  }
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">{translate(emptyMessage)}</p>
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
            {renderActions && (
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50">{translate("Actions")}</th>
            )}
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
              {renderActions && (
                <td className="px-4 py-3 text-sm text-slate-700 border-b border-slate-50">
                  {renderActions(item)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
