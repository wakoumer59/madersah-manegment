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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-b border-slate-100 text-left">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  {col.label}
                </th>
              ))}
              {renderActions && (
                <th className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{translate("Actions")}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <tr key={index} className="hover:bg-slate-50">
                {columns.map((col) => (
                  <td key={col.key} className="border-b border-slate-50 px-4 py-3 text-sm text-slate-700">
                    {col.render ? col.render(item) : String(item[col.key as keyof T])}
                  </td>
                ))}
                {renderActions && (
                  <td className="border-b border-slate-50 px-4 py-3 text-sm text-slate-700">
                    {renderActions(item)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
