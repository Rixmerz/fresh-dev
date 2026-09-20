import { computed, useSignal } from "@preact/signals";

interface MenuItem {
  name: string;
  description: string;
  price: string;
  category: string;
  popular?: boolean;
}

interface MenuFilterProps {
  items: MenuItem[];
}

export default function MenuFilter({ items }: MenuFilterProps) {
  const selectedCategory = useSignal<string>("all");

  const filteredItems = computed(() => {
    if (selectedCategory.value === "all") {
      return items;
    }
    return items.filter((item) => item.category === selectedCategory.value);
  });

  const categories = ["all", "coffee", "pastries", "breakfast", "lunch"];

  return (
    <div class="w-full">
      {/* Filter Buttons */}
      <div class="flex flex-wrap justify-center gap-3 mb-8">
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            onClick={() => selectedCategory.value = category}
            class={`px-6 py-2 rounded-full font-semibold transition-all transform hover:scale-105 ${
              selectedCategory.value === category
                ? "bg-amber-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-amber-200 hover:border-amber-400"
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Menu Items Grid */}
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.value.map((item, idx) => (
          <div
            key={idx}
            class="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 relative"
          >
            {item.popular && (
              <span class="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Popular
              </span>
            )}
            <h3 class="text-xl font-bold text-gray-900 mb-2">{item.name}</h3>
            <p class="text-gray-600 text-sm mb-3">{item.description}</p>
            <div class="flex items-center justify-between">
              <span class="text-2xl font-bold text-amber-600">
                {item.price}
              </span>
              <button
                type="button"
                class="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Ordenar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredItems.value.length === 0 && (
        <div class="text-center py-12">
          <p class="text-gray-500 text-lg">No hay items en esta categoría</p>
        </div>
      )}
    </div>
  );
}
