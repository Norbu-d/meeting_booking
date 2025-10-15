"use client"

import { EnhancedMeetingCalendar } from "@/components/booking/EnhanchedMeetingCalendar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function BookMeeting() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-1">
            <EnhancedMeetingCalendar className="min-h-[600px]"/>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}