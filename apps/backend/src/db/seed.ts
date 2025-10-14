import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Get database URL from environment
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function seed() {
  console.log('🌱 Starting database seed...');

  // Get existing restaurants
  const existingRestaurants = await db.select().from(schema.restaurants);
  console.log(`Found ${existingRestaurants.length} existing restaurants`);

  // Find Joe's Pizza
  const joesPizza = existingRestaurants.find((r) => r.slug === 'joes-pizza');
  if (!joesPizza) {
    console.error('❌ Joe\'s Pizza restaurant not found!');
    process.exit(1);
  }

  console.log(`✅ Found Joe's Pizza: ${joesPizza.id}`);

  // Create dinner menu for Joe's Pizza
  console.log('📋 Creating dinner menu...');
  const [dinnerMenu] = await db
    .insert(schema.menus)
    .values({
      restaurantId: joesPizza.id,
      slug: 'dinner',
      name: 'Dinner Menu',
      description: 'Our delicious dinner offerings',
      status: 'active',
      displayOrder: 1,
    })
    .returning();

  console.log(`✅ Created dinner menu: ${dinnerMenu.id}`);

  // Create menu items
  console.log('🍕 Creating menu items...');

  const menuItems = [
    // Pizzas
    {
      menuId: dinnerMenu.id,
      name: 'Margherita Pizza',
      description: 'Fresh mozzarella, tomato sauce, basil, and extra virgin olive oil on a crispy wood-fired crust',
      price: 1299, // $12.99
      section: 'Pizzas',
      imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
      status: 'available' as const,
      displayOrder: 1,
    },
    {
      menuId: dinnerMenu.id,
      name: 'Pepperoni Pizza',
      description: 'Classic pepperoni with mozzarella cheese and our signature tomato sauce',
      price: 1499, // $14.99
      section: 'Pizzas',
      imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400',
      status: 'available' as const,
      displayOrder: 2,
    },
    {
      menuId: dinnerMenu.id,
      name: 'Veggie Supreme',
      description: 'Bell peppers, onions, mushrooms, olives, and fresh tomatoes',
      price: 1399, // $13.99
      section: 'Pizzas',
      imageUrl: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400',
      status: 'available' as const,
      displayOrder: 3,
    },
    {
      menuId: dinnerMenu.id,
      name: 'Truffle Mushroom Pizza',
      description: 'Wild mushrooms, truffle oil, ricotta, and fresh arugula',
      price: 1899, // $18.99
      section: 'Pizzas',
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
      status: 'sold_out' as const,
      displayOrder: 4,
    },

    // Appetizers
    {
      menuId: dinnerMenu.id,
      name: 'Garlic Bread',
      description: 'Freshly baked bread with garlic butter and herbs',
      price: 599, // $5.99
      section: 'Appetizers',
      imageUrl: 'https://images.unsplash.com/photo-1573140401552-388e30f7bcc2?w=400',
      status: 'available' as const,
      displayOrder: 1,
    },
    {
      menuId: dinnerMenu.id,
      name: 'Caesar Salad',
      description: 'Romaine lettuce, croutons, parmesan cheese, and homemade Caesar dressing',
      price: 899, // $8.99
      section: 'Appetizers',
      imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400',
      status: 'available' as const,
      displayOrder: 2,
    },
    {
      menuId: dinnerMenu.id,
      name: 'Mozzarella Sticks',
      description: 'Crispy breaded mozzarella with marinara sauce',
      price: 799, // $7.99
      section: 'Appetizers',
      imageUrl: null,
      status: 'available' as const,
      displayOrder: 3,
    },
    {
      menuId: dinnerMenu.id,
      name: 'Buffalo Wings',
      description: 'Spicy chicken wings with blue cheese dip',
      price: 1099, // $10.99
      section: 'Appetizers',
      imageUrl: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400',
      status: 'available' as const,
      displayOrder: 4,
    },

    // Pasta
    {
      menuId: dinnerMenu.id,
      name: 'Spaghetti Carbonara',
      description: 'Classic Italian pasta with pancetta, egg, and pecorino romano',
      price: 1599, // $15.99
      section: 'Pasta',
      imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400',
      status: 'available' as const,
      displayOrder: 1,
    },
    {
      menuId: dinnerMenu.id,
      name: 'Lasagna Bolognese',
      description: 'Layers of pasta with rich meat sauce, béchamel, and mozzarella',
      price: 1699, // $16.99
      section: 'Pasta',
      imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400',
      status: 'available' as const,
      displayOrder: 2,
    },
    {
      menuId: dinnerMenu.id,
      name: 'Penne Arrabbiata',
      description: 'Spicy tomato sauce with garlic and red pepper flakes',
      price: 1399, // $13.99
      section: 'Pasta',
      imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400',
      status: 'available' as const,
      displayOrder: 3,
    },

    // Desserts
    {
      menuId: dinnerMenu.id,
      name: 'Tiramisu',
      description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone',
      price: 799, // $7.99
      section: 'Desserts',
      imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400',
      status: 'available' as const,
      displayOrder: 1,
    },
    {
      menuId: dinnerMenu.id,
      name: 'Cannoli',
      description: 'Crispy pastry shells filled with sweet ricotta cream',
      price: 699, // $6.99
      section: 'Desserts',
      imageUrl: 'https://images.unsplash.com/photo-1519915212116-7cfef71f1d3e?w=400',
      status: 'available' as const,
      displayOrder: 2,
    },
    {
      menuId: dinnerMenu.id,
      name: 'Gelato',
      description: 'Italian ice cream - ask about today\'s flavors',
      price: 599, // $5.99
      section: 'Desserts',
      imageUrl: null,
      status: 'available' as const,
      displayOrder: 3,
    },

    // Beverages
    {
      menuId: dinnerMenu.id,
      name: 'Espresso',
      description: 'Rich Italian espresso shot',
      price: 350, // $3.50
      section: 'Beverages',
      imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400',
      status: 'available' as const,
      displayOrder: 1,
    },
    {
      menuId: dinnerMenu.id,
      name: 'Italian Soda',
      description: 'Sparkling water with flavored syrup',
      price: 399, // $3.99
      section: 'Beverages',
      imageUrl: null,
      status: 'available' as const,
      displayOrder: 2,
    },
  ];

  await db.insert(schema.menuItems).values(menuItems);

  console.log(`✅ Created ${menuItems.length} menu items`);
  console.log('🎉 Seed completed successfully!');

  // Close database connection
  await client.end();
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
