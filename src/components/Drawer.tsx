import React from "react";

interface Props {
  open: boolean;
  width: number;
  children?: React.ReactNode;
}

export default function Drawer({ open, width, children }: Props) {
  return (
    <div
      className={`drawer${open ? " open" : ""}`}
      style={{ "--drawer-width": `${width}px` } as React.CSSProperties}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="drawer-inner" style={{ width }}>
        {children}
      </div>
    </div>
  );
}
