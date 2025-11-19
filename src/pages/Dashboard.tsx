import { Card } from "@/components/ui/card";
import { Package, Grid3x3, Upload, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const stats = [
  {
    title: "Total Products",
    value: "248",
    change: "+12%",
    icon: Package,
    color: "text-primary",
  },
  {
    title: "Categories",
    value: "18",
    change: "+3",
    icon: Grid3x3,
    color: "text-success",
  },
  {
    title: "Pending Uploads",
    value: "5",
    change: "Staged",
    icon: Upload,
    color: "text-warning",
  },
  {
    title: "This Month",
    value: "42",
    change: "+23%",
    icon: TrendingUp,
    color: "text-chart-4",
  },
];

const recentActivity = [
  { action: "Created product", item: "Wireless Headphones", time: "2 hours ago" },
  { action: "Updated category", item: "Electronics", time: "5 hours ago" },
  { action: "Bulk upload", item: "12 products", time: "1 day ago" },
  { action: "Created product", item: "Smart Watch", time: "2 days ago" },
];

const Dashboard = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your WooCommerce product manager</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-foreground mb-1">{stat.value}</h3>
                  <p className="text-sm text-success">{stat.change}</p>
                </div>
                <div className={cn("p-3 rounded-lg bg-secondary", stat.color)}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/products">
              <Button className="w-full justify-start" variant="outline">
                <Package className="w-4 h-4 mr-2" />
                Add New Product
              </Button>
            </Link>
            <Link to="/categories">
              <Button className="w-full justify-start" variant="outline">
                <Grid3x3 className="w-4 h-4 mr-2" />
                Manage Categories
              </Button>
            </Link>
            <Link to="/bulk-upload">
              <Button className="w-full justify-start" variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload Images
              </Button>
            </Link>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-4 pb-4 border-b border-border last:border-0">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">{activity.item}</p>
                </div>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default Dashboard;
