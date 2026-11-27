import React from 'react';

export interface ReadingTableProps {
  rows: string[][];
  /** Nhãn vùng dùng cho trình đọc màn hình, ví dụ caption hoặc "Bảng dữ liệu". */
  label: string;
  caption?: string;
  /** Lớp thêm cho bảng, ví dụ chỉnh cỡ chữ theo ngữ cảnh. */
  tableClassName?: string;
}

/** Bảng ngữ nghĩa áp dụng theo cài đặt hiển thị, dùng cho block `table` và phần thay thế của snapshot bảng. */
export const ReadingTable: React.FC<ReadingTableProps> = ({ rows, label, caption, tableClassName = '' }) => {
  const [header, ...body] = rows;
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="max-w-full overflow-x-auto rounded-lg border border-current/20"
    >
      <table className={`w-full min-w-max border-collapse text-left text-[0.82em] leading-relaxed ${tableClassName}`}>
        {caption && <caption className="caption-top px-4 py-3 text-left font-semibold">{caption}</caption>}
        <thead>
          <tr>
            {header.map((cell, cellIndex) => (
              <th key={cellIndex} scope="col" className="border-b border-r border-current/20 px-4 py-3 align-top font-semibold last:border-r-0">{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border-b border-r border-current/15 px-4 py-3 align-top last:border-r-0">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
