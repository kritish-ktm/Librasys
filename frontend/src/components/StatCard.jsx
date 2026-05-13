import "../styles/dashboard.css";

function StatCard({ title, value, detail, icon: Icon, tone = "green" }) {
  return (
    <article className={`app-stat-card ${tone}`}>
      <span className="app-stat-icon">{Icon && <Icon size={30} />}</span>
      <span>
        <small>{title}</small>
        <strong>{value}</strong>
        {detail && <em>{detail}</em>}
      </span>
    </article>
  );
}

export default StatCard;
