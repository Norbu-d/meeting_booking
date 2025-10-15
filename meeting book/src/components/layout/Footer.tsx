export function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-lg font-semibold">RICB Booking System</h3>
            <p className="text-sm text-gray-600">Simple meeting scheduling</p>
          </div>
          
        </div>
        <div className="mt-8 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} RICB. All rights reserved.
        </div>
      </div>
    </footer>
  )
}