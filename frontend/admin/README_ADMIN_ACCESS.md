# Admin Panel Access Guide

## How to Access Admin Panel

### Step 1: Create/Update Admin User

You need to have a user with `role: "admin"` in the database. You can do this by:

**Option A: Update existing user in MongoDB**
```javascript
// In MongoDB shell or MongoDB Compass
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

**Option B: Use Admin API (if you're already an admin)**
```javascript
PUT /api/admin/users/:id/role
Headers: Authorization: Bearer <admin-token>
Body: { "role": "admin" }
```

### Step 2: Login

1. Go to `/login.html` on your frontend
2. Enter your admin email and password
3. After successful login, you will be automatically redirected to `/admin/index.html`

### Step 3: Access Admin Panel

Once logged in as admin:
- **Automatic Redirect**: After login, admins are automatically redirected to `/admin/index.html`
- **Manual Access**: Click "Admin Panel" link in the user dropdown menu (top right)
- **Direct URL**: Navigate to `http://localhost:3001/admin/index.html`

## Admin Panel Features

- **Dashboard**: View statistics (users, products, orders)
- **User Management**: View, update roles, delete users
- **Product Management**: Create, update, delete products
- **Order Management**: View all orders/carts

## Security

- All admin pages are protected by `admin-auth.js`
- Non-admin users will be redirected to home page
- Admin status is verified on every page load
- JWT token is required for all admin API calls

## Troubleshooting

**Problem**: Admin page doesn't open after login
- **Solution**: Check browser console for errors
- Verify user role is "admin" in database
- Clear localStorage and login again
- Check that `admin-auth.js` is loaded in admin pages

**Problem**: "Access denied" message
- **Solution**: Verify your user role is "admin" in database
- Check that JWT token is valid
- Try logging out and logging in again
