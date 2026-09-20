interface PricingJoyeriaProps {
  plans?: Array<{
    name: string;
    price: string;
    period: string;
    cta: string;
  }>;
  features?: Array<{
    category: string;
    items: Array<{
      name: string;
      starter: boolean | string;
      professional: boolean | string;
      enterprise: boolean | string;
    }>;
  }>;
}

export default function PricingJoyeria({
  plans = [
    { name: "Starter", price: "$29", period: "/mo", cta: "Start Trial" },
    { name: "Professional", price: "$79", period: "/mo", cta: "Get Started" },
    { name: "Enterprise", price: "Custom", period: "", cta: "Contact Sales" }
  ],
  features = [
    {
      category: "Core Features",
      items: [
        { name: "Team members", starter: "5", professional: "25", enterprise: "Unlimited" },
        { name: "Storage", starter: "10 GB", professional: "100 GB", enterprise: "Unlimited" },
        { name: "Projects", starter: "10", professional: "100", enterprise: "Unlimited" }
      ]
    },
    {
      category: "Analytics & Reporting",
      items: [
        { name: "Basic analytics", starter: true, professional: true, enterprise: true },
        { name: "Advanced reports", starter: false, professional: true, enterprise: true },
        { name: "Custom dashboards", starter: false, professional: false, enterprise: true }
      ]
    },
    {
      category: "Support",
      items: [
        { name: "Email support", starter: true, professional: true, enterprise: true },
        { name: "Priority support", starter: false, professional: true, enterprise: true },
        { name: "Dedicated manager", starter: false, professional: false, enterprise: true }
      ]
    }
  ]
}: PricingJoyeriaProps) {
  return (
    <section class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">
            Compare Plans
          </h2>
          <p class="text-xl text-gray-600">
            Find the perfect plan for your needs
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="border-b-2 border-gray-200">
                <th class="text-left py-6 px-4 w-1/3">
                  <span class="text-lg font-semibold text-gray-900">Features</span>
                </th>
                {plans.map((plan, index) => (
                  <th key={index} class="text-center py-6 px-4">
                    <div class="text-2xl font-bold text-gray-900 mb-2">{plan.name}</div>
                    <div class="text-3xl font-bold text-purple-600 mb-1">
                      {plan.price}
                      {plan.period && <span class="text-lg text-gray-600">{plan.period}</span>}
                    </div>
                    <a
                      href="#"
                      class="inline-block mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      {plan.cta}
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((category, catIndex) => (
                <>
                  <tr key={catIndex} class="bg-gray-50">
                    <td colspan={plans.length + 1} class="py-4 px-4">
                      <h3 class="font-bold text-gray-900 text-lg">{category.category}</h3>
                    </td>
                  </tr>
                  {category.items.map((item, itemIndex) => (
                    <tr key={itemIndex} class="border-b border-gray-100 hover:bg-gray-50">
                      <td class="py-4 px-4 text-gray-700">{item.name}</td>
                      <td class="py-4 px-4 text-center">
                        {typeof item.starter === 'boolean' ? (
                          item.starter ? (
                            <svg class="w-6 h-6 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg class="w-6 h-6 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )
                        ) : (
                          <span class="text-gray-900 font-medium">{item.starter}</span>
                        )}
                      </td>
                      <td class="py-4 px-4 text-center">
                        {typeof item.professional === 'boolean' ? (
                          item.professional ? (
                            <svg class="w-6 h-6 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg class="w-6 h-6 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )
                        ) : (
                          <span class="text-gray-900 font-medium">{item.professional}</span>
                        )}
                      </td>
                      <td class="py-4 px-4 text-center">
                        {typeof item.enterprise === 'boolean' ? (
                          item.enterprise ? (
                            <svg class="w-6 h-6 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg class="w-6 h-6 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )
                        ) : (
                          <span class="text-gray-900 font-medium">{item.enterprise}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
