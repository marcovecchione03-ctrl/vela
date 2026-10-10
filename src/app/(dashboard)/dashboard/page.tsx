import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardHome() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Appointments Today" value="0" />
        <StatCard title="Appointments This Week" value="0" />
        <StatCard title="Customers Today" value="0" />
        <StatCard title="Cancellation Rate" value="0%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Next Appointment</CardTitle>
            <CardDescription>Upcoming bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center text-neutral-500">
              <p>No appointments yet.</p>
              <p className="text-sm mt-1">When customers book, they will appear here.</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
            <CardDescription>Most booked services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center text-neutral-500">
              <p>No data available.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title: string, value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-neutral-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-neutral-900">{value}</div>
      </CardContent>
    </Card>
  )
}
