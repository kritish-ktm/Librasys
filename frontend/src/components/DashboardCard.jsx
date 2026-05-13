import { ArrowRight } from "lucide-react";
import "../styles/dashboard.css";

function DashboardCard({ title, description, icon: Icon, onClick }) {
  return (
    <button type="button" className="dashboard-module-card" onClick={onClick}>
      <span className="dashboard-module-icon">{Icon && <Icon size={28} />}</span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ArrowRight size={18} />
    </button>
  );
}

export default DashboardCard;
