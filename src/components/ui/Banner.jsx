import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext.jsx";
import Icon from "../ui/Icon.jsx";

export default function Banner() {
  const { banner } = useApp();
  if (!banner) return null;

  return (
    <div className="border-b border-error/30 bg-error-container px-gutter py-sm text-body-sm text-on-error-container lg:px-margin-desktop">
      {banner}
    </div>
  );
}

export function StatusBadge({ enabled }) {
  if (enabled) {
    return (
      <span className="inline-flex items-center rounded-full border border-active-border bg-active-bg px-2 py-0.5 text-xs font-label-sm text-active-text">
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-disabled-border bg-disabled-bg px-2 py-0.5 text-xs font-label-sm text-disabled-text">
      Paused
    </span>
  );
}

export function Card({ children, className = "", ...props }) {
  return (
    <section
      className={`rounded-xl border border-card bg-surface-container-lowest p-md shadow-card ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}

export function Breadcrumb({ items }) {
  return (
    <div className="mb-xs flex items-center gap-xs text-body-sm text-on-surface-variant">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-xs">
          {i > 0 && <Icon name="chevron_right" size={16} />}
          {item.to ? (
            <Link to={item.to} className="transition-colors hover:text-primary">
              {item.label}
            </Link>
          ) : (
            <span className={i === items.length - 1 ? "font-semibold text-on-surface" : ""}>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
