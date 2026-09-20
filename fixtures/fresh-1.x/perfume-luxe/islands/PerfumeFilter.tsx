import { computed, useSignal } from "@preact/signals";
import type { Perfume } from "../types/landing.ts";

interface PerfumeFilterProps {
  perfumes: Perfume[];
}

export default function PerfumeFilter({ perfumes }: PerfumeFilterProps) {
  const selectedCategory = useSignal<string>("all");

  const filteredPerfumes = computed(() => {
    if (selectedCategory.value === "all") {
      return perfumes;
    }
    return perfumes.filter(
      (perfume) => perfume.category === selectedCategory.value,
    );
  });

  const categories = [
    "all",
    ...Array.from(new Set(perfumes.map((p) => p.category))),
  ];

  return (
    <div class="w-full">
      {/* Filter Buttons */}
      <div class="flex flex-wrap justify-center gap-3 mb-8">
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            onClick={() => (selectedCategory.value = category)}
            class={`px-6 py-2 rounded-full font-semibold transition-all transform hover:scale-105 ${
              selectedCategory.value === category
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-purple-200 hover:border-purple-400"
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Perfume Items Grid */}
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPerfumes.value.map((perfume, idx) => (
          <div
            key={idx}
            class="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 relative overflow-hidden"
          >
            {perfume.featured && (
              <span class="absolute top-4 right-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                ⭐ Featured
              </span>
            )}

            {perfume.image && (
              <img
                src={perfume.image}
                alt={perfume.name}
                class="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}

            <h3 class="text-xl font-bold text-gray-900 mb-2">{perfume.name}</h3>

            <p class="text-gray-600 text-sm mb-3">{perfume.description}</p>

            <div class="bg-purple-50 rounded-lg p-3 mb-4">
              <p class="text-xs text-gray-600 mb-1">
                <strong>Notes:</strong> {perfume.notes}
              </p>
              <p class="text-xs text-gray-600">
                <strong>Volume:</strong> {perfume.volume}
              </p>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-2xl font-bold text-purple-600">
                {perfume.price}
              </span>
              <button
                type="button"
                class="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-shadow font-medium"
              >
                Comprar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredPerfumes.value.length === 0 && (
        <div class="text-center py-12">
          <p class="text-gray-500 text-lg">
            No hay perfumes en esta categoría
          </p>
        </div>
      )}
    </div>
  );
}
