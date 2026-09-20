import { useSignal, computed } from "@preact/signals";

export default function PriceCalculator() {
  const quantity = useSignal(1);
  const unitPrice = 299;
  const wholesalePrice = 249;
  const wholesaleMinimum = 5;

  const pricePerUnit = computed(() => {
    return quantity.value >= wholesaleMinimum ? wholesalePrice : unitPrice;
  });

  const totalPrice = computed(() => {
    return quantity.value * pricePerUnit.value;
  });

  const savings = computed(() => {
    if (quantity.value >= wholesaleMinimum) {
      const regularTotal = quantity.value * unitPrice;
      return regularTotal - totalPrice.value;
    }
    return 0;
  });

  const discountPercentage = computed(() => {
    if (quantity.value >= wholesaleMinimum) {
      return Math.round(((unitPrice - wholesalePrice) / unitPrice) * 100);
    }
    return 0;
  });

  return (
    <div class="max-w-md mx-auto p-8 bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl shadow-xl border border-pink-100">
      <h2 class="text-3xl font-bold mb-2 text-center text-rose-900">
        💰 Calculadora de Precios
      </h2>
      <p class="text-center text-gray-600 mb-6 text-sm">
        Descubre cuánto ahorras comprando por mayor
      </p>

      <div class="mb-6">
        <label class="block text-sm font-semibold text-gray-700 mb-3">
          ¿Cuántas piezas deseas?
        </label>
        <div class="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => quantity.value = Math.max(1, quantity.value - 1)}
            disabled={quantity.value <= 1}
            class="w-12 h-12 bg-rose-500 text-white rounded-full hover:bg-rose-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold text-xl transition-colors"
          >
            −
          </button>
          <div class="w-24 text-center">
            <span class="text-4xl font-bold text-rose-900">{quantity}</span>
            <p class="text-xs text-gray-500">piezas</p>
          </div>
          <button
            onClick={() => quantity.value++}
            class="w-12 h-12 bg-rose-500 text-white rounded-full hover:bg-rose-600 font-bold text-xl transition-colors"
          >
            +
          </button>
        </div>

        <input
          type="range"
          min="1"
          max="20"
          value={quantity.value}
          onInput={(e) => quantity.value = parseInt((e.target as HTMLInputElement).value)}
          class="w-full h-2 bg-pink-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
        />
      </div>

      <div class="bg-white rounded-xl p-6 shadow-md space-y-4">
        <div class="flex justify-between items-center pb-3 border-b border-gray-200">
          <span class="text-gray-600">Precio por unidad:</span>
          <span class="text-xl font-bold text-gray-900">
            ${pricePerUnit}
          </span>
        </div>

        {quantity.value >= wholesaleMinimum && (
          <div class="bg-green-50 border-2 border-green-500 rounded-lg p-3 animate-pulse">
            <div class="flex items-center justify-center gap-2 mb-1">
              <span class="text-2xl">🎉</span>
              <span class="font-bold text-green-700">
                ¡Precio Mayoreo Activo!
              </span>
            </div>
            <p class="text-center text-sm text-green-600">
              Ahorras {discountPercentage}% en cada pieza
            </p>
          </div>
        )}

        {quantity.value < wholesaleMinimum && (
          <div class="bg-amber-50 border border-amber-300 rounded-lg p-3">
            <p class="text-center text-sm text-amber-700">
              💡 Compra {wholesaleMinimum - quantity.value} pieza{wholesaleMinimum - quantity.value > 1 ? 's' : ''} más para obtener precio mayoreo
            </p>
          </div>
        )}

        <div class="flex justify-between items-center py-3 border-t-2 border-gray-300">
          <span class="text-lg font-semibold text-gray-700">Total:</span>
          <span class="text-3xl font-bold text-rose-600">
            ${totalPrice.toLocaleString('es-MX')}
          </span>
        </div>

        {savings.value > 0 && (
          <div class="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg p-4 text-center">
            <p class="text-sm font-medium mb-1">✨ Tu ahorro total</p>
            <p class="text-3xl font-bold">${savings.toLocaleString('es-MX')}</p>
            <p class="text-xs mt-1 opacity-90">vs. precio unitario</p>
          </div>
        )}
      </div>

      <button class="w-full mt-6 bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:from-rose-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg">
        🛒 Agregar al Carrito
      </button>

      <p class="text-center text-xs text-gray-500 mt-4">
        🚚 Envío gratis en todas las compras por mayor
      </p>
    </div>
  );
}
