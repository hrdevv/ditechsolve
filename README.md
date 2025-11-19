# WordPress/WooCommerce Product Management Dashboard

A modern React-based admin dashboard for managing WordPress/WooCommerce products, categories, and bulk image uploads.

## 🎯 Features

- **Product Management**: View, search, and manage WooCommerce products
- **Category Management**: Create and organize product categories
- **Bulk Upload**: Upload multiple images and convert them to products
- **WordPress Integration**: Connect directly to WordPress/WooCommerce REST API
- **Modern UI**: Beautiful, responsive design with dark mode support
- **Real-time Sync**: Direct API integration for real product management

---

## 📋 Prerequisites

### WordPress/WooCommerce Setup

1. **WordPress Site** (version 5.8+)
2. **WooCommerce Plugin** (version 3.5+)
3. **HTTPS Connection** (required for API authentication)
4. **Permalinks Enabled** (Settings → Permalinks → anything except "Plain")

### Generate API Credentials

Navigate to your WordPress admin panel:

1. Go to **WooCommerce → Settings → Advanced → REST API**
2. Click **Add Key** or **Create an API key**
3. Fill in the details:
   - **Description**: "Product Management Dashboard"
   - **User**: Select admin user
   - **Permissions**: Read/Write
4. Click **Generate API Key**
5. **IMPORTANT**: Copy your **Consumer Key** (ck_xxx) and **Consumer Secret** (cs_xxx) immediately

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 3. Configure WordPress Connection

1. Navigate to **Settings** page in the dashboard
2. Enter your WordPress connection details:
   - **Site URL**: `https://yoursite.com` (without trailing slash)
   - **Consumer Key**: Your WooCommerce API key (ck_xxx)
   - **Consumer Secret**: Your WooCommerce API secret (cs_xxx)
3. Click **Test Connection** to verify
4. Click **Save Settings** to persist configuration

---

## 🔧 WordPress/WooCommerce REST API Integration

### How It Works

This dashboard uses the **WooCommerce REST API v3** to communicate with your WordPress site. All operations are performed through authenticated HTTP requests.

### Authentication Method

The app uses **Basic Authentication** over HTTPS:

```
Authorization: Basic base64(consumer_key:consumer_secret)
```

This is the recommended method by WooCommerce for HTTPS connections.

### API Endpoints Used

| Endpoint | Purpose | Method |
|----------|---------|--------|
| `/wc/v3/products` | List/create products | GET, POST |
| `/wc/v3/products/{id}` | Get/update/delete product | GET, PUT, DELETE |
| `/wc/v3/products/batch` | Bulk operations | POST |
| `/wc/v3/products/categories` | List/create categories | GET, POST |
| `/wc/v3/products/categories/{id}` | Get/update/delete category | GET, PUT, DELETE |
| `/wp/v2/media` | Upload images | POST |
| `/wc/v3/system_status` | Test connection | GET |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Layout.tsx              # Main layout with sidebar
│   ├── NavLink.tsx             # Navigation link component
│   └── ui/                     # shadcn/ui components
├── hooks/
│   └── useWordPressSettings.tsx # WordPress settings hook
├── lib/
│   ├── wordpress-api.ts        # WordPress REST API client
│   └── utils.ts                # Utility functions
├── pages/
│   ├── Dashboard.tsx           # Dashboard overview
│   ├── Products.tsx            # Product listing and management
│   ├── Categories.tsx          # Category management
│   ├── BulkUpload.tsx          # Bulk image upload
│   └── Settings.tsx            # WordPress connection settings
└── App.tsx                     # Main app with routing
```

---

## 🔑 Key Components

### WordPress API Client (`src/lib/wordpress-api.ts`)

Core API client handling all WordPress/WooCommerce interactions:

```typescript
// Configure API
wordpressAPI.configure({
  siteUrl: 'https://yoursite.com',
  consumerKey: 'ck_xxx',
  consumerSecret: 'cs_xxx'
});

// Create a product
const product = await wordpressAPI.createProduct({
  name: 'New Product',
  type: 'simple',
  regular_price: '29.99',
  status: 'publish',
  categories: [{ id: 1 }]
});

// Upload image and create product
const result = await wordpressAPI.createProductFromImage(
  imageFile,
  { name: 'Product Name', regular_price: '19.99' }
);
```

### Settings Hook (`src/hooks/useWordPressSettings.tsx`)

React hook for managing WordPress connection:

```typescript
const { settings, saveSettings, testConnection, isConfigured } = useWordPressSettings();

// Save credentials
await saveSettings({
  siteUrl: 'https://yoursite.com',
  consumerKey: 'ck_xxx',
  consumerSecret: 'cs_xxx'
});

// Test connection
const result = await testConnection();
if (result.success) {
  console.log('Connected!', result.version);
}
```

---

## 🐛 Troubleshooting

### Connection Failed

**Error**: "API Error: 401 Unauthorized"

**Solutions**:
- Verify Consumer Key and Consumer Secret are correct
- Ensure API key has Read/Write permissions
- Check that HTTPS is enabled on your WordPress site
- Verify permalinks are not set to "Plain"

---

**Error**: "API Error: 404 Not Found"

**Solutions**:
- Check site URL is correct (no trailing slash)
- Ensure WooCommerce plugin is active
- Verify REST API is not disabled

---

**Error**: "CORS Error" or "Failed to fetch"

**Solutions**:
- Add your dashboard domain to WordPress CORS whitelist
- Install WooCommerce CORS plugin
- Or add to `functions.php`:

```php
add_action('rest_api_init', function() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
});
```

---

## 📚 API Reference

### Product Object Structure

```typescript
interface Product {
  id?: number;
  name: string;                    // Required
  type?: 'simple' | 'grouped' | 'external' | 'variable';
  status?: 'draft' | 'pending' | 'private' | 'publish';
  regular_price?: string;
  sale_price?: string;
  sku?: string;
  categories?: Array<{ id: number }>;
  images?: Array<{ id?: number; src?: string }>;
}
```

---

## 📖 Additional Resources

- [WooCommerce REST API Documentation](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

---

## 💡 Master Prompt for AI Agent

This dashboard is a **React-based admin interface** that communicates with **WordPress/WooCommerce** via REST API.

### Key Principles

1. **API-First Design**: All WordPress interactions go through `src/lib/wordpress-api.ts`
2. **Type Safety**: Maintain TypeScript interfaces for all API objects
3. **React Hooks Pattern**: Use `useWordPressSettings` for configuration access
4. **Error Handling**: Always wrap API calls in try-catch with user-friendly toast messages
5. **Loading States**: Show loading indicators during async operations

### Common Patterns

**Creating a Product**:
```typescript
const { api } = useWordPressSettings();
const product = await api.createProduct({
  name: 'Product Name',
  regular_price: '19.99',
  status: 'publish'
});
```

**Uploading Image + Creating Product**:
```typescript
const { product, mediaId } = await api.createProductFromImage(
  imageFile,
  { name: 'Product', regular_price: '29.99' }
);
```

**Bulk Operations**:
```typescript
const results = await api.bulkCreateProductsFromImages([
  { file: image1, productData: { name: 'Product 1', ... } },
  { file: image2, productData: { name: 'Product 2', ... } }
]);
```

---

**Built with ❤️ using React, TypeScript, and the WordPress REST API**
