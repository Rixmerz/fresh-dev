interface Stat {
  icon?: string;
  value: string;
  label: string;
}

interface ComplianceShowcaseProps {
  stats: Stat[];
  bgColor?: string;
}

export default function ComplianceShowcase({
  stats,
  bgColor = "bg-gradient-to-r from-purple-900 to-blue-900",
}: ComplianceShowcaseProps) {
  return (
    <section class={`${bgColor} py-16 px-4`}>
      <div class="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, idx) => (
          <div key={idx} class="text-center text-white">
            {stat.icon && <div class="text-4xl mb-2">{stat.icon}</div>}
            <div class="text-4xl font-bold mb-2">{stat.value}</div>
            <div class="text-gray-300">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
