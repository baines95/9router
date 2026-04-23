"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import PropTypes from "prop-types";
import { Badge } from "@/components/ui/badge";
import { CaretRight as ChevronRight, ArrowsDownUp as ArrowUpDown, ArrowUp, ArrowDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(2)}`;

function fmtTime(iso) {
 if (!iso) return "Chưa từng";
 const diffMins = Math.floor((Date.now() - new Date(iso)) / 60000);
 if (diffMins < 1) return "Vừa xong";
 if (diffMins < 60) return `${diffMins}p trước`;
 if (diffMins < 1440) return `${Math.floor(diffMins / 60)}g trước`;
 return new Date(iso).toLocaleDateString("vi-VN");
}

function SortIcon({ field, currentSort, currentOrder }) {
 if (currentSort !== field) return <ArrowUpDown className="size-3 ml-1 opacity-20 inline"/>;
 return currentOrder ==="asc"
 ? <ArrowUp className="size-3 ml-1 inline text-primary"/> 
 : <ArrowDown className="size-3 ml-1 inline text-primary"/>;
}

SortIcon.propTypes = {
 field: PropTypes.string.isRequired,
 currentSort: PropTypes.string.isRequired,
 currentOrder: PropTypes.string.isRequired,
};

/**
 * Render 3 token or cost cells based on viewMode
 */
function ValueCells({ item, viewMode, isSummary = false }) {
  if (viewMode === "tokens") {
    return (
      <>
        <td className="px-3 py-2 text-right text-muted-foreground text-xs font-medium tabular-nums">
          {isSummary && item.promptTokens === undefined ? "—" : fmt(item.promptTokens)}
        </td>
        <td className="px-3 py-2 text-right text-muted-foreground text-xs font-medium tabular-nums">
          {isSummary && item.completionTokens === undefined ? "—" : fmt(item.completionTokens)}
        </td>
        <td className="px-3 py-2 text-right text-xs font-medium tabular-nums">
          {fmt(item.totalTokens)}
        </td>
      </>
    );
  }
  return (
    <>
      <td className="px-3 py-2 text-right text-muted-foreground text-xs font-medium tabular-nums">
        {isSummary && item.inputCost === undefined ? "—" : fmtCost(item.inputCost)}
      </td>
      <td className="px-3 py-2 text-right text-muted-foreground text-xs font-medium tabular-nums">
        {isSummary && item.outputCost === undefined ? "—" : fmtCost(item.outputCost)}
      </td>
      <td className="px-3 py-2 text-right text-xs font-medium text-muted-foreground tabular-nums">
        {fmtCost(item.totalCost || item.cost)}
      </td>
    </>
  );
}

ValueCells.propTypes = {
 item: PropTypes.object.isRequired,
 viewMode: PropTypes.string.isRequired,
 isSummary: PropTypes.bool,
};

/**
 * Reusable sortable usage table with expandable group rows.
 */
export default function UsageTable({
 columns,
 groupedData,
 tableType,
 sortBy,
 sortOrder,
 onToggleSort,
 viewMode,
 storageKey,
 renderDetailCells,
 renderSummaryCells,
 emptyMessage,
}) {
 const [expanded, setExpanded] = useState(new Set());

 // Load expanded state from localStorage
 useEffect(() => {
 try {
 const saved = localStorage.getItem(storageKey);
 if (saved) setExpanded(new Set(JSON.parse(saved)));
 } catch (e) {
 console.error(`Failed to load ${storageKey}:`, e);
 }
 }, [storageKey]);

 // Save expanded state to localStorage
 useEffect(() => {
 try {
 localStorage.setItem(storageKey, JSON.stringify([...expanded]));
 } catch (e) {
 console.error(`Failed to save ${storageKey}:`, e);
 }
 }, [expanded, storageKey]);

 const toggleGroup = useCallback((groupKey) => {
 setExpanded((prev) => {
 const next = new Set(prev);
 next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
 return next;
 });
 }, []);

 const valueColumns = useMemo(() => {
 if (viewMode === "tokens") {
 return [
 { field: "promptTokens", label: "Token Nhập" },
 { field: "completionTokens", label: "Token Xuất" },
 { field: "totalTokens", label: "Tổng Tokens" },
 ];
 }
 return [
 { field: "promptTokens", label: "Phí Đầu vào" },
 { field: "completionTokens", label: "Phí Đầu ra" },
 { field: "cost", label: "Tổng chi phí" },
 ];
 }, [viewMode]);

 const totalColSpan = columns.length + valueColumns.length;

 return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted/10 text-muted-foreground text-xs font-semibold capitalize">
          <tr>
            {columns.map((col) => (
              <th
                key={col.field}
                className={cn(
                  "px-3 py-2 cursor-pointer hover:bg-muted transition-colors border-b border-border/40",
                  col.align === "right" ? "text-right" : ""
                )}
                onClick={() => onToggleSort(tableType, col.field)}
              >
                <div className={cn("flex items-center gap-1", col.align === "right" && "justify-end")}>
                  {col.label}
                  <SortIcon field={col.field} currentSort={sortBy} currentOrder={sortOrder} />
                </div>
              </th>
            ))}
            {valueColumns.map((col) => (
              <th
                key={col.field}
                className="px-3 py-2 text-right cursor-pointer hover:bg-muted transition-colors border-b border-border/40"
                onClick={() => onToggleSort(tableType, col.field)}
              >
                <div className="flex items-center justify-end gap-1">
                  {col.label}
                  <SortIcon field={col.field} currentSort={sortBy} currentOrder={sortOrder} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {groupedData.map((group) => (
            <Fragment key={group.groupKey}>
              {/* Group summary row */}
              <tr
                className="group-summary cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleGroup(group.groupKey)}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <ChevronRight className={cn(
                      "size-3.5 text-muted-foreground transition-transform",
                      expanded.has(group.groupKey) && "rotate-90"
                    )} />
                    <span className={cn(
                      "text-xs font-semibold",
                      group.summary.pending > 0 && "text-primary"
                    )}>
                      {group.groupKey}
                    </span>
                  </div>
                </td>
                {renderSummaryCells(group)}
                <ValueCells item={group.summary} viewMode={viewMode} isSummary />
              </tr>
              {/* Detail rows */}
              {expanded.has(group.groupKey) && group.items.map((item) => (
                <tr
                  key={`detail-${item.key}`}
                  className="group-detail bg-muted/5 hover:bg-muted/20 transition-colors"
                >
                  {renderDetailCells(item)}
                  <ValueCells item={item} viewMode={viewMode} />
                </tr>
              ))}
            </Fragment>
          ))}
          {groupedData.length === 0 && (
            <tr>
              <td colSpan={totalColSpan} className="px-3 py-12 text-center text-muted-foreground font-semibold capitalize text-xs">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
 );
}

UsageTable.propTypes = {
 columns: PropTypes.arrayOf(PropTypes.shape({
 field: PropTypes.string.isRequired,
 label: PropTypes.string.isRequired,
 align: PropTypes.string,
 })).isRequired,
 groupedData: PropTypes.array.isRequired,
 tableType: PropTypes.string.isRequired,
 sortBy: PropTypes.string.isRequired,
 sortOrder: PropTypes.string.isRequired,
 onToggleSort: PropTypes.func.isRequired,
 viewMode: PropTypes.string.isRequired,
 storageKey: PropTypes.string.isRequired,
 renderDetailCells: PropTypes.func.isRequired,
 renderSummaryCells: PropTypes.func.isRequired,
 emptyMessage: PropTypes.string.isRequired,
};

export { fmt, fmtCost, fmtTime };
