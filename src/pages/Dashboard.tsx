import { Card } from "@/components/ui/card";
import { 
  Package, 
  Grid3x3, 
  Upload, 
  DollarSign, 
  ShoppingCart, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSalesReport, useTopSellers, useOrdersCounts, useProductsCounts } from "@/hooks/useReports";
import { useWooCommerce } from "@/contexts/PlatformContext";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";

const Dashboard = () => {
  const { isConnected } = useWooCommerce();
  const { data: salesReport, isLoading: salesLoading } = useSalesReport("month");
  const { data: topSellers, isLoading: topSellersLoading } = useTopSellers("month");
  const { data: ordersCounts, isLoading: ordersLoading } = useOrdersCounts();
  const { data: productsCounts, isLoading: productsLoading } = useProductsCounts();
  const { data: products } = useProducts();
  const { data: categories } = useCategories();

  const isLoading = salesLoading || topSellersLoading || ordersLoading || productsLoading;

  const totalProducts = productsCounts?.reduce((acc, item) => acc + item.total, 0) || products?.length || 0;
  const totalCategories = categories?.length || 0;
  const totalOrders = ordersCounts?.reduce((acc, item) => acc + item.total, 0) || 0;
  const sales = salesReport?.[0];

  const stats = [
    {
      title: "Total Sales",
      value: sales ? `$${parseFloat(sales.total_sales).toLocaleString()}` : "$0",
      change: "This month",
      icon: DollarSign,
      color: "text-success",
    },
    {
      title: "Orders",
      value: sales?.total_orders?.toString() || totalOrders.toString(),
      change: `${ordersCounts?.find(o => o.slug === "processing")?.total || 0} processing`,
      icon: ShoppingCart,
      color: "text-primary",
    },
    {
      title: "Products",
      value: totalProducts.toString(),
      change: `${productsCounts?.find(p => p.slug === "simple")?.total || 0} simple`,
      icon: Package,
      color: "text-chart-4",
    },
    {
      title: "Categories",
      value: totalCategories.toString(),
      change: "Active",
      icon: Grid3x3,
      color: "text-warning",
    },
  ];

  const processingOrders = ordersCounts?.find(o => o.slug === "processing")?.total || 0;
  const pendingOrders = ordersCounts?.find(o => o.slug === "pending")?.total || 0;
  const completedOrders = ordersCounts?.find(o => o.slug === "completed")?.total || 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          {isConnected 
            ? "Real-time data from your WooCommerce store" 
            : "Welcome to your WooCommerce product manager (Mock Mode)"}
        </p>
      </div>

      {!isConnected && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-foreground mb-1">Mock Mode Active</p>
            <p className="text-sm text-muted-foreground">
              You're viewing sample data. <Link to="/settings" className="text-primary hover:underline">Connect your WordPress site</Link> to see real statistics.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold text-foreground mb-1">{stat.value}</h3>
                      <p className="text-sm text-success">{stat.change}</p>
                    </>
                  )}
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

        {/* Order Summary */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Order Summary</h3>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <span className="text-sm font-medium">Processing</span>
                <span className="font-bold text-primary">{processingOrders}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <span className="text-sm font-medium">Pending Payment</span>
                <span className="font-bold text-warning">{pendingOrders}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <span className="text-sm font-medium">Completed</span>
                <span className="font-bold text-success">{completedOrders}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Top Sellers */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Top Sellers This Month</h3>
          {topSellersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : topSellers && topSellers.length > 0 ? (
            <div className="space-y-3">
              {topSellers.slice(0, 5).map((item, index) => (
                <div key={item.product_id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{item.quantity} sold</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No sales data yet</p>
          )}
        </Card>
      </div>

      {/* Sales Overview */}
      {sales && (
        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Net Sales</p>
              <p className="text-xl font-bold">${parseFloat(sales.net_sales).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Items Sold</p>
              <p className="text-xl font-bold">{sales.total_items}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Tax</p>
              <p className="text-xl font-bold">${parseFloat(sales.total_tax).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Refunds</p>
              <p className="text-xl font-bold">{sales.total_refunds}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
