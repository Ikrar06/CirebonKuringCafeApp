export default function TestCSSPage() {
  return (
    <div className="min-h-screen bg-blue-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Tailwind CSS Test
        </h1>
        <p className="text-gray-600 mb-4">
          Jika Anda melihat styling (background biru, card putih dengan shadow),
          maka Tailwind CSS bekerja dengan benar.
        </p>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
          Test Button
        </button>
      </div>
    </div>
  )
}