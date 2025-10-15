import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Header } from "@/components/layout/Header" // Import the shared Header

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Use the shared Header component */}
      <Header />

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Book Meetings with Ease
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Simplify your scheduling process with our intuitive meeting booking platform.
          </p>
        </div>

        {/* CTA Section - Moved up */}
        <div className="text-center mb-16">
          <Link to="/book">
            <Button size="lg" className="px-12 py-8 text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300">
              Book a Meeting Now
            </Button>
          </Link>
          
          <p className="mt-6 text-gray-500 text-lg">
            Simple, efficient, and hassle-free meeting scheduling
          </p>
        </div>

        {/* Features Grid - Moved below CTA */}
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="p-8 hover:shadow-lg transition-all duration-300 border-0 shadow-sm rounded-xl">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl text-blue-600">📅</span>
            </div>
            <h3 className="font-semibold text-xl mb-4">Easy Scheduling</h3>
            <p className="text-gray-600">
              Select available time slots that work for you with our intuitive calendar interface.
            </p>
          </Card>
          
          <Card className="p-8 hover:shadow-lg transition-all duration-300 border-0 shadow-sm rounded-xl">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl text-green-600">⏱️</span>
            </div>
            <h3 className="font-semibold text-xl mb-4">Time Management</h3>
            <p className="text-gray-600">
              Set meeting durations and buffer times between appointments effortlessly.
            </p>
          </Card>
          
          <Card className="p-8 hover:shadow-lg transition-all duration-300 border-0 shadow-sm rounded-xl">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl text-purple-600">🔔</span>
            </div>
            <h3 className="font-semibold text-xl mb-4">Smart Reminders</h3>
            <p className="text-gray-600">
              Get timely email and browser notifications before your scheduled meetings.
            </p>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500">
          <p>© {new Date().getFullYear()} RICB Meeting Booking. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}