import { useSignal } from "@preact/signals";

export default function SecurityServiceFilter() {
  const formData = useSignal({
    name: "",
    email: "",
    message: "",
  });
  const isSubmitting = useSignal(false);
  const submitStatus = useSignal<"idle" | "success" | "error">("idle");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    isSubmitting.value = true;

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Reset form
      formData.value = { name: "", email: "", message: "" };
      submitStatus.value = "success";
    } catch (_error) {
      submitStatus.value = "error";
    } finally {
      isSubmitting.value = false;
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      class="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow-md"
    >
      <h2 class="text-2xl font-bold mb-4">SecurityServiceFilter</h2>

      <div>
        <label class="block text-gray-700 font-medium mb-2">Name</label>
        <input
          type="text"
          value={formData.value.name}
          onInput={(e) =>
            formData.value = { ...formData.value, name: e.currentTarget.value }}
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          required
        />
      </div>

      <div>
        <label class="block text-gray-700 font-medium mb-2">Email</label>
        <input
          type="email"
          value={formData.value.email}
          onInput={(e) =>
            formData.value = {
              ...formData.value,
              email: e.currentTarget.value,
            }}
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          required
        />
      </div>

      <div>
        <label class="block text-gray-700 font-medium mb-2">Message</label>
        <textarea
          value={formData.value.message}
          onInput={(e) =>
            formData.value = {
              ...formData.value,
              message: e.currentTarget.value,
            }}
          rows={4}
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting.value}
        class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isSubmitting.value ? "Sending..." : "Send Message"}
      </button>

      {submitStatus.value === "success" && (
        <div class="p-4 bg-green-100 text-green-700 rounded-lg">
          Message sent successfully!
        </div>
      )}

      {submitStatus.value === "error" && (
        <div class="p-4 bg-red-100 text-red-700 rounded-lg">
          Error sending message. Please try again.
        </div>
      )}
    </form>
  );
}
